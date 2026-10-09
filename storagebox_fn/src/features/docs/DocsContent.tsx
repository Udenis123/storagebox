import { useMemo, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { CodeBlock } from "@/components/shared/CopyField";
import { credentialsEnv } from "@/features/developer/credentials";
import { buildSnippets, SNIPPET_LANGUAGES, type SnippetLanguage } from "@/features/developer/snippets";
import { API_BASE_URL, MAX_FILES_PER_UPLOAD, MAX_UPLOAD_MB, SDK_PACKAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const DOC_SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "quick-start", title: "Quick start" },
  { id: "authentication", title: "Authentication" },
  { id: "upload", title: "Upload files" },
  { id: "list", title: "List and search" },
  { id: "signed-links", title: "Signed links" },
  { id: "delete", title: "Delete files" },
  { id: "transformations", title: "Image transformations" },
  { id: "webhooks", title: "Webhooks" },
  { id: "errors", title: "Errors and limits" },
] as const;

type DocSectionId = (typeof DOC_SECTIONS)[number]["id"];

const CONCEPTS = [
  ["Cloud name", "Your account's short name. It appears in every file link, like /f/acme/…"],
  ["Public ID", "The name of a file inside your cloud. You choose it or we derive it from the file name."],
  ["Collection", "A folder path such as invoices/2026. Created automatically the first time you upload into it."],
  ["Access", "PUBLIC files have a permanent link. PRIVATE files open only through signed links."],
];

const TRANSFORMS = [
  ["w_<px>", "Width in pixels (1–5000)", "w_400"],
  ["h_<px>", "Height in pixels (1–5000)", "h_300"],
  ["c_fill", "Crop to exactly width × height", "w_200,h_200,c_fill"],
  ["c_fit", "Fit inside width × height, keep proportions", "w_800,h_600,c_fit"],
  ["c_limit", "Like fit, but never enlarge", "w_1600,c_limit"],
  ["q_<1-100>", "Output quality", "q_75"],
  ["f_<format>", "Convert to webp, avif, jpg or png", "f_webp"],
];

const ERRORS = [
  ["400", "E1000 · E4001 · E4002", `Invalid input, an unsupported file type, or a file over ${MAX_UPLOAD_MB} MB`],
  ["401", "E2006 · E2010", "Wrong API key or secret, or a key from another cloud"],
  ["402", "E4003", "Storage is full — delete files or ask for more space in the dashboard"],
  ["403", "E2007 · E5000 · E5001", "Read-only key used to write, private file without a signature, or expired link"],
  ["404", "E4000", "No file with that public ID"],
  ["409", "E4004 · E3001", "Public ID or collection already exists"],
  ["429", "E1003", "Too many requests — wait for the Retry-After header"],
];

const WEBHOOK_SNIPPET = `import express from "express";
import { verifyWebhook } from "${SDK_PACKAGE}";

const app = express();

// Keep the raw body: the signature is computed over it
app.post("/hooks/storagebox", express.text({ type: "*/*" }), async (req, res) => {
  const event = await verifyWebhook(
    req.body,
    req.header("x-storagebox-signature"),
    process.env.STORAGEBOX_WEBHOOK_SECRET!,
  );
  if (!event) return res.sendStatus(401);

  if (event.event === "file.uploaded") {
    console.log("New file", event.data.publicId, event.data.url);
  }
  res.sendStatus(200);
});`;

function DocSection({ id, title, children }: { id: DocSectionId; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-4 border-t pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="grid max-w-3xl gap-3 text-base leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground [&_strong]:text-foreground">{children}</div>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex max-w-3xl gap-3 rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground [&_code]:font-mono [&_code]:text-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

function DocTable({ head, rows, monoColumns = [0] }: { head: string[]; rows: string[][]; monoColumns?: number[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {head.map((label) => (
              <th key={label} className="px-4 py-2.5 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={index} className={cn("px-4 py-3 align-top", monoColumns.includes(index) && "font-mono whitespace-nowrap", index === row.length - 1 && "text-muted-foreground")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LanguagePicker({ value, onChange }: { value: SnippetLanguage; onChange: (language: SnippetLanguage) => void }) {
  return (
    <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Code language">
      {SNIPPET_LANGUAGES.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            value === option.value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Developer guide shared by the public documentation page and the dashboard. */
export function DocsContent({ cloudName = "acme" }: { cloudName?: string }) {
  const [language, setLanguage] = useState<SnippetLanguage>("sdk");
  const snippets = useMemo(() => buildSnippets(API_BASE_URL), []);
  const deliveryBase = `${API_BASE_URL}/f/${cloudName}`;
  const picker = <LanguagePicker value={language} onChange={setLanguage} />;

  return (
    <div className="grid min-w-0 gap-12">
      <DocSection id="introduction" title="Introduction">
        <Prose>
          <p>
            StorageBox stores files and gives each one a link. You can use it from the dashboard, from the <code>{SDK_PACKAGE}</code> npm
            package, or from any language through the REST API at <code>{API_BASE_URL}/v1</code>.
          </p>
          <p>Four ideas cover almost everything:</p>
        </Prose>
        <dl className="grid max-w-3xl gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          {CONCEPTS.map(([term, meaning]) => (
            <div key={term} className="grid gap-1 bg-card p-4">
              <dt className="font-medium">{term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{meaning}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection id="quick-start" title="Quick start">
        <Prose>
          <p>
            <strong>1.</strong> Request an account and wait for approval. <strong>2.</strong> Create an API key on the API Keys page.{" "}
            <strong>3.</strong> Install the package and put your credentials in <code>.env</code>:
          </p>
        </Prose>
        <CodeBlock code={`npm install ${SDK_PACKAGE}\n\n# .env\n${credentialsEnv({ cloudName })}`} />
        <Prose>
          <p>
            <strong>4.</strong> Upload your first file. The client reads the <code>STORAGEBOX_*</code> variables on its own:
          </p>
        </Prose>
        <CodeBlock
          code={`import { readFile } from "node:fs/promises";\nimport { StorageBox } from "${SDK_PACKAGE}";\n\nconst storagebox = new StorageBox();\n\nconst file = await storagebox.files.upload(\n  { data: await readFile("invoice.pdf"), filename: "invoice.pdf" },\n  { collection: "invoices/2026" },\n);\n\nconsole.log(file.url); // ${deliveryBase}/invoice.pdf`}
        />
      </DocSection>

      <DocSection id="authentication" title="Authentication">
        <Prose>
          <p>
            Every <code>/v1</code> request is signed with an API key and secret, sent as HTTP Basic auth (key as username, secret as password)
            or as the <code>x-api-key</code> and <code>x-api-secret</code> headers. Add <code>x-cloud-name</code> to reject keys that belong to
            another cloud.
          </p>
        </Prose>
        <CodeBlock code={`Authorization: Basic base64("API_KEY:API_SECRET")\nx-cloud-name: ${cloudName}\n\nBase URL: ${API_BASE_URL}/v1`} />
        <Note>
          Keep the secret on your server. Never ship it in browser or mobile code — upload through your backend, or use a read-only key where you only
          need to list files.
        </Note>
      </DocSection>

      <DocSection id="upload" title="Upload files">
        <Prose>
          <p>
            Send files as multipart form data, up to {MAX_FILES_PER_UPLOAD} files and {MAX_UPLOAD_MB} MB each — or send a JSON body with a{" "}
            <code>url</code> and StorageBox downloads the file for you. Collections are created on the fly.
          </p>
        </Prose>
        {picker}
        <CodeBlock code={snippets.upload[language]} />
      </DocSection>

      <DocSection id="list" title="List and search">
        <Prose>
          <p>Filter by collection, type, access, tag or name. Results come back in pages of up to 100.</p>
        </Prose>
        {picker}
        <CodeBlock code={snippets.list[language]} />
      </DocSection>

      <DocSection id="signed-links" title="Signed links">
        <Prose>
          <p>
            Private files are only reachable through a signed link. Pick how long it works — from 60 seconds to 7 days. After that the link answers{" "}
            <code>403</code>. You can sign links for public files too, for example to force a download.
          </p>
        </Prose>
        {picker}
        <CodeBlock code={snippets.signed[language]} />
      </DocSection>

      <DocSection id="delete" title="Delete files">
        <Prose>
          <p>Deleting removes the file and every cached image version. Its links stop working straight away.</p>
        </Prose>
        {picker}
        <CodeBlock code={snippets.remove[language]} />
      </DocSection>

      <DocSection id="transformations" title="Image transformations">
        <Prose>
          <p>
            Put a transformation between your cloud name and the public ID. Join parameters with commas. Each version is generated on the first
            request and cached after that.
          </p>
        </Prose>
        <CodeBlock code={`${deliveryBase}/PUBLIC_ID.jpg                        # original\n${deliveryBase}/w_400,h_300,c_fill,f_webp/PUBLIC_ID.jpg  # 400×300 WebP\n${deliveryBase}/PUBLIC_ID.pdf?dl=1                   # force download`} />
        <DocTable head={["Parameter", "What it does", "Example"]} rows={TRANSFORMS} monoColumns={[0, 2]} />
        <Note>
          In code, <code>storagebox.url(file, {"{ width: 400, format: \"webp\" }"})</code> builds the same link without a network call.
        </Note>
        <Prose>
          <p>
            Word, Excel, CSV and Markdown links open in a built-in viewer when someone visits them in a browser. Your code still receives the
            original bytes. Add <code>?raw=1</code> to always get the file itself, or <code>?dl=1</code> to download it.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="webhooks" title="Webhooks">
        <Prose>
          <p>
            Add an endpoint on the Webhooks page and StorageBox will <code>POST</code> to it on <code>file.uploaded</code> and{" "}
            <code>file.deleted</code>. The body is <code>{"{ event, createdAt, data }"}</code>, and the <code>x-storagebox-signature</code> header
            holds an HMAC-SHA256 of the raw body made with your webhook secret.
          </p>
        </Prose>
        <CodeBlock code={WEBHOOK_SNIPPET} />
      </DocSection>

      <DocSection id="errors" title="Errors and limits">
        <Prose>
          <p>
            Every response is JSON shaped like <code>{"{ status, message, data, errorCode }"}</code>. The SDK throws a{" "}
            <code>StorageBoxError</code> with the same <code>status</code> and <code>errorCode</code>. Rate limit headers{" "}
            <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code> come with every call.
          </p>
        </Prose>
        <DocTable head={["Status", "Error code", "Meaning"]} rows={ERRORS} monoColumns={[0, 1]} />
      </DocSection>
    </div>
  );
}
