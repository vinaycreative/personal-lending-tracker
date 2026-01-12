import BorrowerProfileClient from "./BorrowerProfileClient"

export default async function BorrowerProfilePage({
  params,
}: {
  params: Promise<{ id?: string }>
}) {
  const { id } = await params
  return <BorrowerProfileClient loanId={id ?? ""} />
}
