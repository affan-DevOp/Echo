"use client";

import { FileIcon, X } from "lucide-react";
import Image from "next/image";

import { UploadDropzone } from "@/lib/uploadthing";

import "@uploadthing/react/styles.css";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "serverImage"
}

export const FileUpload = ({
  onChange,
  value,
  endpoint
}: FileUploadProps) => {
  const fileType = value?.split(".").pop();

  if (value && fileType !== "pdf") {
    return (
      <div className="relative h-20 w-20">
        <Image
          fill
          src={value}
          alt="Upload"
          className="rounded-full"
        />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (value && fileType === "pdf") {
    let fileName = value;
    try {
      const url = new URL(value);
      fileName = url.searchParams.get("name") || value.split("/").pop() || value;
    } catch {
      fileName = value.split("/").pop() || value;
    }

    return (
      <div className="relative flex items-center p-3 mt-2 rounded-md bg-indigo-100 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 w-full">
        <FileIcon className="h-8 w-8 flex-shrink-0 fill-indigo-200 stroke-indigo-600 dark:stroke-indigo-400" />
        <div className="min-w-0 flex-1 ml-3 pr-2">
          <a 
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium block truncate"
            title={fileName}
          >
            {fileName}
          </a>
        </div>
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm transition hover:bg-rose-600"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={(res) => {
        const file = res?.[0];
        if (file) {
          onChange(`${file.url}?name=${file.name}`);
        }
      }}
      onUploadError={(error: Error) => {
        console.log(error);
      }}
    />
  )
}