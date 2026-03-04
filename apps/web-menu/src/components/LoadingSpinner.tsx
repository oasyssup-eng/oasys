export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-orange-500" />
    </div>
  );
}
