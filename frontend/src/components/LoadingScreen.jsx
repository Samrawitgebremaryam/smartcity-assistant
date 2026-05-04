export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border border-white/10 border-t-white" />
      </div>
    </div>
  )
}
