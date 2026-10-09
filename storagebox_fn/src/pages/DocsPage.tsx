import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { CodeBlock } from "@/components/shared/CopyField";
import { PageHeader, SectionTitle } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { credentialsEnv } from "@/features/developer/credentials";
import { buildSnippets, SNIPPET_LANGUAGES, type SnippetLanguage } from "@/features/developer/snippets";
import { API_BASE_URL, API_DOCS_URL } from "@/lib/constants";

const TRANSFORMS = [
  ["w_<px>", "Width in pixels (1–5000)", "w_400"],
  ["h_<px>", "Height in pixels (1–5000)", "h_300"],
  ["c_fill", "Crop to exactly w × h", "w_200,h_200,c_fill"],
  ["c_fit", "Fit inside w × h, keep proportions", "w_800,h_600,c_fit"],
  ["c_limit", "Like fit, but never enlarge", "w_1600,c_limit"],
  ["q_<1-100>", "Output quality", "q_75"],
  ["f_<format>", "Convert to webp, avif, jpg or png", "f_webp"],
];

const ERRORS = [
  ["401", "Missing or wrong API key / secret"],
  ["403", "Read-only key used for a write, private file without a valid signature, or expired link"],
  ["402", "Storage quota exceeded"],
  ["409", "publicId or collection already exists"],
  ["429", "Rate limit reached — retry after the Retry-After header"],
];

function Section({ title, description, code }: { title: string; description: string; code: string }) {
  return (
    <section className="grid gap-3">
      <SectionTitle>{title}</SectionTitle>
      <p className="text-base text-muted-foreground">{description}</p>
      <CodeBlock code={code} />
    </section>
  );
}

export default function DocsPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const snippets = useMemo(() => buildSnippets(API_BASE_URL), []);
  const cloudName = user?.account.cloudName ?? "your-cloud";
  const sampleUrl = `${API_BASE_URL}/f/${cloudName}`;

  return (
    <>
      <PageHeader
        title="API Docs"
        description="Everything you need to store files and get links from your own apps."
        actions={
          <Button variant="outline" size="lg" className="h-11 text-base" render={<a href={API_DOCS_URL} target="_blank" rel="noreferrer" />}>
            Interactive reference <ExternalLink />
          </Button>
        }
      />

      <div className="grid gap-10">
        <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-6">
          <SectionTitle>1. Authenticate</SectionTitle>
          <p className="text-base text-muted-foreground">
            Create a key on the <Link to="/keys" className="text-primary hover:underline">API Keys</Link> page. Send it with HTTP Basic auth — the API key is
            the username and the secret is the password — or with the <code className="font-mono">x-api-key</code> and{" "}
            <code className="font-mono">x-api-secret</code> headers. Keep secrets on your server, never in browser code.
          </p>
          <CodeBlock code={`# .env\n${credentialsEnv({ cloudName })}\n\n# HTTP\nAuthorization: Basic base64("API_KEY:API_SECRET")\nx-cloud-name: ${cloudName}   # optional, rejects keys from another cloud\nBase URL: ${API_BASE_URL}/v1`} />
        </section>

        <div className="grid gap-6">
          <Tabs value={language} onValueChange={(value) => setLanguage(value as SnippetLanguage)}>
            <TabsList className="flex-wrap">
              {SNIPPET_LANGUAGES.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Section
            title="2. Upload a file"
            description="Send one or more files as multipart form data (or a remote url as JSON). Collections are created automatically. Up to 20 files and 100 MB each."
            code={snippets.upload[language]}
          />
          <Section title="3. List and search" description="Filter by collection path, type, access, tag or name. Results are paginated." code={snippets.list[language]} />
          <Section
            title="4. Share with a signed link"
            description="Private files are only reachable through signed links that expire. You can also sign links for public files."
            code={snippets.signed[language]}
          />
          <Section title="5. Delete" description="Removes the file and every cached variant. Its links stop working immediately." code={snippets.remove[language]} />
        </div>

        <section className="grid gap-3">
          <SectionTitle>Delivery URLs</SectionTitle>
          <p className="text-base text-muted-foreground">
            Every public file has a permanent link. Add a transformation segment to resize or convert images on the fly — each variant is generated once and cached.
          </p>
          <CodeBlock code={`${sampleUrl}/PUBLIC_ID.pdf\n${sampleUrl}/PUBLIC_ID.pdf?dl=1          # force download\n${sampleUrl}/w_400,h_300,c_fill,f_webp/PUBLIC_ID.jpg`} />
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRANSFORMS.map(([parameter, meaning, example]) => (
                  <TableRow key={parameter}>
                    <TableCell className="font-mono">{parameter}</TableCell>
                    <TableCell className="text-base">{meaning}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{example}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="grid gap-3">
          <SectionTitle>Responses and errors</SectionTitle>
          <p className="text-base text-muted-foreground">
            Every response is JSON: <code className="font-mono">{`{ "status": "success" | "error", "message", "data", "errorCode" }`}</code>. Rate limit headers{" "}
            <code className="font-mono">X-RateLimit-Limit</code> and <code className="font-mono">X-RateLimit-Remaining</code> are sent on every call.
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableBody>
                {ERRORS.map(([code, meaning]) => (
                  <TableRow key={code}>
                    <TableCell className="w-20 font-mono font-semibold">{code}</TableCell>
                    <TableCell className="text-base">{meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}
