// lib/balance-payment.ts
// Pure helper (no server or browser imports) so the admin page preview and the
// /api/registrations/[id]/balance-payment route always produce the SAME numbers.
//
// Rules (they mirror calcRegistrationTerms in "@/lib/payment-terms"):
//  - A payment reduces the remaining balance (principal). Overdue interest is a function of the
//    remaining balance, so once the balance is 0 no more interest is charged.
//  - Paying the full "total payable" (balance + overdue interest) settles the account.
//  - Paying the balance but NOT the overdue interest is ambiguous, so it is refused unless the
//    admin explicitly chooses to waive the rest of the interest.
//  - Anything above the total payable is kept as a credit balance.

export type BalanceTermsLike = {
    balance: number | null;
    interest: number;
    totalPayable: number | null;
};

export type BalanceAllocation = {
    ok: boolean;
    error?: string;
    amount: number;
    balanceBefore: number;
    interest: number;
    totalPayable: number;
    balanceAfter: number; // remaining balance (principal) once this payment is applied
    interestWaived: number;
    creditAdded: number;
    fullySettled: boolean;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const peso = (n: number) => `₱${n.toLocaleString()}`;

export function allocateBalancePayment(
    terms: BalanceTermsLike | null | undefined,
    amount: number,
    waiveInterest = false
): BalanceAllocation {
    const balance = terms?.balance ?? null;
    const interest = terms?.interest ?? 0;
    const totalPayable = r2((balance ?? 0) + interest);
    const base: BalanceAllocation = {
        ok: false,
        amount: r2(Number(amount) || 0),
        balanceBefore: balance ?? 0,
        interest,
        totalPayable,
        balanceAfter: balance ?? 0,
        interestWaived: 0,
        creditAdded: 0,
        fullySettled: false,
    };

    if (balance == null) {
        return { ...base, error: "The total due for this registration is not set, so the balance cannot be computed." };
    }
    if (!(base.amount > 0)) {
        return { ...base, error: "Enter an amount greater than ₱0." };
    }
    if (balance <= 0) {
        return { ...base, error: "This registration is already fully settled. There is no balance left to pay." };
    }

    const EPS = 0.005;

    // Pays everything owed (balance + interest), possibly more
    if (base.amount + EPS >= totalPayable) {
        return { ...base, ok: true, balanceAfter: 0, creditAdded: r2(Math.max(0, base.amount - totalPayable)), fullySettled: true };
    }

    // Covers the balance but not all of the overdue interest
    if (base.amount + EPS >= balance) {
        const unpaidInterest = r2(totalPayable - base.amount);
        if (!waiveInterest) {
            return {
                ...base,
                error: `This covers the balance but not all of the ${peso(interest)} overdue interest. Enter ${peso(totalPayable)} to settle everything, or tick "Waive the remaining ${peso(unpaidInterest)} interest".`,
            };
        }
        return { ...base, ok: true, balanceAfter: 0, interestWaived: unpaidInterest, fullySettled: true };
    }

    // Partial payment: less than the balance
    return { ...base, ok: true, balanceAfter: r2(balance - base.amount) };
}