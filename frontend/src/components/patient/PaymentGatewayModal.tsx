import { Building2, Check, CreditCard, Loader2, Smartphone, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

type Method = 'upi' | 'card' | 'netbanking' | 'wallet'

const METHODS: { id: Method; label: string; icon: typeof CreditCard }[] = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: Building2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
]

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'] as const
const WALLETS = ['Paytm', 'Amazon Pay', 'Mobikwik', 'Freecharge'] as const

type Phase = 'form' | 'processing' | 'success'

/**
 * A demo payment gateway UI — visually and interactionally like a real
 * one (method tabs, UPI/card/netbanking/wallet inputs, a processing
 * spinner, a success state) but not wired to any real payment provider.
 * See docs/VISITNOW_PRODUCT_DECISIONS.md §8.7/§9-13: this prototype's
 * "payment" is the token-creation call itself: this modal's job is to
 * make that moment *feel* like a real checkout instead of a bare
 * button, not to actually move money. Chosen over a redirect-to-a-fake-
 * gateway-page pattern because it keeps the patient in the same flow,
 * which is also how most real Indian payment gateways (Razorpay, PayU,
 * Cashfree) actually present themselves — an in-page modal, not a full
 * navigation.
 */
export function PaymentGatewayModal({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const [method, setMethod] = useState<Method>('upi')
  const [phase, setPhase] = useState<Phase>('form')
  const [upiId, setUpiId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [bank, setBank] = useState<string>(BANKS[0])
  const [wallet, setWallet] = useState<string>(WALLETS[0])

  const canPay =
    method === 'upi'
      ? /^[\w.-]+@[\w.-]+$/.test(upiId)
      : method === 'card'
        ? cardNumber.replace(/\s/g, '').length === 16 && cardExpiry.length === 5 && cardCvv.length === 3
        : true // netbanking/wallet just need a selection, which always has a default

  const pay = () => {
    if (!canPay || phase !== 'form') return
    setPhase('processing')
    // Simulated gateway round-trip — long enough to read as real
    // processing, short enough not to feel broken. See module docstring.
    window.setTimeout(() => {
      setPhase('success')
      window.setTimeout(onSuccess, 700)
    }, 1400)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={phase === 'form' ? onCancel : undefined}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)]"
      >
        {phase !== 'success' && (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">VisitNow Secure Checkout</p>
              <p className="font-display text-lg font-bold text-[var(--color-text)]">₹{amount}</p>
            </div>
            {phase === 'form' && (
              <button onClick={onCancel} aria-label="Close" className="rounded-full p-1.5 text-[var(--color-text-faint)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-text)]">
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {phase === 'form' && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`flex items-center gap-2 rounded-[var(--radius-md)] border-2 px-3 py-2.5 text-left text-[13px] font-bold transition-colors ${
                    method === id
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-300)]'
                  }`}
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {method === 'upi' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-border)]/40 px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)]">
                  Google Pay · PhonePe · Paytm · any UPI app
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">UPI ID</span>
                  <input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
                  />
                </label>
              </div>
            )}

            {method === 'card' && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Card number</span>
                  <input
                    value={cardNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
                      setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '))
                    }}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] tracking-wide focus:border-[var(--color-brand-400)] focus:outline-none"
                  />
                </label>
                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Expiry</span>
                    <input
                      value={cardExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits)
                      }}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">CVV</span>
                    <input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="123"
                      inputMode="numeric"
                      type="password"
                      className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Select your bank</span>
                {BANKS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBank(b)}
                    className={`flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                      bank === b ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'border-[var(--color-border)] text-[var(--color-text)]'
                    }`}
                  >
                    {b}
                    {bank === b && <Check size={15} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}

            {method === 'wallet' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Select your wallet</span>
                {WALLETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWallet(w)}
                    className={`flex items-center justify-between rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                      wallet === w ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'border-[var(--color-border)] text-[var(--color-text)]'
                    }`}
                  >
                    {w}
                    {wallet === w && <Check size={15} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
            <Loader2 size={36} className="animate-spin text-[var(--color-brand-500)]" aria-hidden="true" />
            <div>
              <p className="font-display text-base font-bold text-[var(--color-text)]">Processing payment…</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Do not close this window.</p>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
              <Check size={30} strokeWidth={3} aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-[var(--color-text)]">Payment successful</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">₹{amount} paid</p>
            </div>
          </div>
        )}

        {phase === 'form' && (
          <div className="border-t border-[var(--color-border)] px-5 py-4">
            <button
              onClick={pay}
              disabled={!canPay}
              className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand-600)] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Pay ₹{amount}
            </button>
            <p className="mt-2 text-center text-[11px] text-[var(--color-text-faint)]">
              Demo checkout. No real payment is processed.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
