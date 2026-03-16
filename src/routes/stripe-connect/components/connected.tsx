import { ExclamationCircle } from "@medusajs/icons"
import { Button, Heading, Text } from "@medusajs/ui"
import { useCreateStripeOnboarding } from "../../../hooks/api"
import { Link } from "react-router-dom"

export const Connected = ({
  status,
}: {
  status: "connected" | "pending" | "not connected"
}) => {
  const { mutateAsync, isPending } = useCreateStripeOnboarding()

  const hostname = window.location.href

  const handleOnboarding = async () => {
    try {
      const { payout_account } = await mutateAsync({
        context: {
          refresh_url: hostname,
          return_url: hostname,
        },
      })
      window.location.replace(payout_account.onboarding.data.url)
    } catch {
      // toast.error('Connection error!');
      window.location.reload()
    }
  }

  return status === "connected" ? (
    <div className="flex items-center justify-center text-center my-32 flex-col">
      <Heading level="h2" className="mt-4">
        Your Stripe Account is ready
      </Heading>
      <Link to="https://dashboard.stripe.com/payments" target="_blank">
        <Button className="mt-4">Go to Stripe</Button>
      </Link>
    </div>
  ) : (
    <div className="flex items-center justify-center text-center my-32 flex-col max-w-md mx-auto">
      <ExclamationCircle />
      <Heading level="h2" className="mt-4">
        Oppsett ikke fullført
      </Heading>
      <Text className="text-ui-fg-subtle" size="small">
        Stripe-kontoen er opprettet, men oppsettet ble ikke fullført. Stripe kan også kreve ekstra
        verifisering (f.eks. dokumentopplasting) før utbetalinger aktiveres. Klikk under for å
        fortsette eller fullføre eventuelle ekstra steg.
      </Text>
      <Button
        isLoading={isPending}
        className="mt-4"
        onClick={() => handleOnboarding()}
      >
        Fortsett Stripe-oppsett
      </Button>
    </div>
  )
}
