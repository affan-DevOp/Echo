import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 justify-center items-center h-full w-full bg-white dark:bg-[#313338]">
      <Loader2 className="h-10 w-10 text-zinc-500 animate-spin my-4" />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Loading...
      </p>
    </div>
  );
}
