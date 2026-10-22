// COVENANT payment authorization contract (Forseti, Policy:1 / BasicCustom<CovenantPayment>:BasicCustom<1>).
//
// STATUS: WRITTEN, NOT COMPILED, NOT DEPLOYED. Deploying a custom Forseti contract is not
// self-service; it goes to the Tide team (info@tide.org). No dotnet toolchain was available to
// compile-check it. Its SHA-512 (uppercase hex) is what COVENANT binds into every transaction as
// `tideContractId`, so the day it is deployed, already-frozen transactions name the right contract.
//
// What it would enforce at the ORK signing boundary (mirrored by lib/covenant/policy.ts, which is
// a labelled REFERENCE evaluator, not Forseti):
//   - the signed bytes are "COVENANT/TXN/V1\n" + RFC 8785 canonical JSON of a TransactionV1
//   - domain, schema, policy version and buyer org are the pinned values
//   - USD only, 0 < amount <= MaxCents, vendor -> beneficiary pair on the allowlist param
//   - amount > AutoLimitCents needs a FinanceRole approver AND a ProcurementRole approver,
//     two distinct people, and neither may be the executor (requester)
//   - executor holds ExecutorRole and its doken is not expired
//
// UNVERIFIED API surface (not in the Tide pack canon, check when compiling): PolicyDecision.IsAllowed,
// and Count/indexer on the list DokenDto.WrapAll returns.
using Ork.Forseti.Sdk;
using Cryptide.Tools;
using Ork.Shared.Models.Contracts;
using System;
using System.Collections.Generic;
using System.Text;

public class Contract : IAccessPolicy
{
    [PolicyParam(Required = true, Description = "Client id the COVENANT roles live on")]
    public string Resource { get; set; }

    [PolicyParam(Required = true, Description = "Role the buyer operator (executor) must hold")]
    public string ExecutorRole { get; set; }

    [PolicyParam(Required = true, Description = "Finance approver role")]
    public string FinanceRole { get; set; }

    [PolicyParam(Required = true, Description = "Procurement approver role")]
    public string ProcurementRole { get; set; }

    [PolicyParam(Required = true, Description = "Auto-approval ceiling in cents, decimal string")]
    public string AutoLimitCents { get; set; }

    [PolicyParam(Required = true, Description = "Hard ceiling in cents, decimal string")]
    public string MaxCents { get; set; }

    [PolicyParam(Required = true, Description = "Allowlist, 'vendor=beneficiary;vendor=beneficiary'")]
    public string Allowlist { get; set; }

    [PolicyParam(Required = true, Description = "Buyer org this signing key serves")]
    public string BuyerOrg { get; set; }

    private const string Prefix = "COVENANT/TXN/V1\n";

    // State threaded between stages; the executor stage has no Data, so fail closed if unset.
    private bool _dataOk;
    private bool _needsApprovers;
    private List<string> _approverIds = new List<string>();

    public PolicyDecision ValidateData(DataContext ctx)
    {
        if (ctx.Data == null) return PolicyDecision.Deny("no data");
        ReadOnlyMemory<byte> data = ctx.Data;
        // UNVERIFIED: position of the BasicCustom draft inside ctx.Data. Confirm with the Tide team.
        string text = Encoding.UTF8.GetString(data.GetValue(0).Span);
        if (!text.StartsWith(Prefix, StringComparison.Ordinal)) return PolicyDecision.Deny("bad domain prefix");
        string json = text.Substring(Prefix.Length);

        long auto, max, amount;
        if (!TryParseCents(AutoLimitCents, out auto) || !TryParseCents(MaxCents, out max))
            return PolicyDecision.Deny("bad policy params");
        if (!TryParseCents(Field(json, "amountMinor", false), out amount) || amount <= 0)
            return PolicyDecision.Deny("INVALID_SCHEMA amount");

        string vendor = Field(json, "vendorOrgId", true);
        string beneficiary = Field(json, "beneficiaryId", true);
        bool allowed = false;
        string[] pairs = Allowlist.Split(';');
        for (int i = 0; i < pairs.Length; i++)
        {
            if (pairs[i] == vendor + "=" + beneficiary) allowed = true;
        }

        PolicyDecision d = Decision
            .Require(Field(json, "domain", true) == "COVENANT/PROCUREMENT/PAYMENT/V1", "UNKNOWN_POLICY domain")
            .Require(Field(json, "schemaVersion", true) == "covenant.tx.v1", "INVALID_SCHEMA version")
            .Require(Field(json, "policyVersion", true) == "covenant-procurement-v1", "UNKNOWN_POLICY version")
            .Require(Field(json, "buyerOrgId", true) == BuyerOrg, "CROSS_TENANT")
            .Require(Field(json, "currency", true) == "USD", "INVALID_SCHEMA currency")
            .Require(amount <= max, "AMOUNT_OVER_CAP")
            .Require(allowed, "BENEFICIARY_NOT_APPROVED");
        if (!d.IsAllowed) return d;

        _needsApprovers = amount > auto;
        _dataOk = true;
        return PolicyDecision.Allow();
    }

    public PolicyDecision ValidateApprovers(ApproversContext ctx)
    {
        if (!_dataOk) return PolicyDecision.Deny("data stage did not run");
        if (!_needsApprovers) return PolicyDecision.Allow();
        var approvers = DokenDto.WrapAll(ctx.Dokens);

        // A finance approver and a procurement approver who are two different people.
        string financeId = null;
        string procurementId = null;
        for (int i = 0; i < approvers.Count; i++)
        {
            var a = approvers[i];
            if (a.IsNull || a.IsExpired) continue;
            _approverIds.Add(a.UserId);
            if (financeId == null && a.HasRole(Resource, FinanceRole)) financeId = a.UserId;
        }
        for (int i = 0; i < approvers.Count; i++)
        {
            var a = approvers[i];
            if (a.IsNull || a.IsExpired) continue;
            if (procurementId == null && a.HasRole(Resource, ProcurementRole) && a.UserId != financeId)
                procurementId = a.UserId;
        }
        return Decision
            .Require(financeId != null, "APPROVAL_REQUIRED finance")
            .Require(procurementId != null, "APPROVAL_REQUIRED procurement (distinct person)");
    }

    public PolicyDecision ValidateExecutor(ExecutorContext ctx)
    {
        if (!_dataOk) return PolicyDecision.Deny("data stage did not run");
        var executor = new DokenDto(ctx.Doken);
        bool selfApproved = false;
        for (int i = 0; i < _approverIds.Count; i++)
        {
            if (_approverIds[i] == executor.UserId) selfApproved = true;
        }
        return Decision
            .RequireNotExpired(executor)
            .RequireRole(executor, Resource, ExecutorRole)
            .Forbid(selfApproved, "APPROVER_NOT_DISTINCT requester approved own payment");
    }

    // Reads a scalar from canonical JSON. COVENANT restricts ids to [A-Za-z0-9._:-], so a value
    // never contains a quote or comma and this scan is exact for the bytes we sign.
    private static string Field(string json, string key, bool quoted)
    {
        string marker = quoted ? "\"" + key + "\":\"" : "\"" + key + "\":";
        int start = json.IndexOf(marker, StringComparison.Ordinal);
        if (start < 0) return "";
        start += marker.Length;
        int end = start;
        while (end < json.Length && json[end] != (quoted ? '"' : ',') && json[end] != '}') end++;
        return json.Substring(start, end - start);
    }

    // Digit loop: no sign, separator, whitespace, culture or leading zero can change the value.
    private static bool TryParseCents(string s, out long value)
    {
        value = 0;
        if (s == null || s.Length == 0 || s.Length > 15 || (s.Length > 1 && s[0] == '0')) return false;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < '0' || s[i] > '9') return false;
            value = value * 10 + (s[i] - '0');
        }
        return true;
    }
}
