export type SnippetLanguage = "curl" | "sdk" | "python";

export const SNIPPET_LANGUAGES: { value: SnippetLanguage; label: string }[] = [
  { value: "curl", label: "cURL" },
  { value: "sdk", label: "JavaScript / TypeScript" },
  { value: "python", label: "Python" },
];

type SnippetSet = Record<SnippetLanguage, string>;

export type DocsSnippets = {
  upload: SnippetSet;
  list: SnippetSet;
  signed: SnippetSet;
  remove: SnippetSet;
};

export function buildSnippets(apiUrl: string): DocsSnippets {
  return {
    upload: {
      curl: `curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" \\
  -F "file=@contract.pdf" \\
  -F "collection=contracts/2026" \\
  -F "access=PRIVATE" \\
  -F "tags=legal,signed" \\
  ${apiUrl}/v1/files

# Import from a URL instead of a local file
curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" -H "content-type: application/json" \\
  -d '{"url":"https://example.com/report.pdf","collection":"reports"}' \\
  ${apiUrl}/v1/files`,
      sdk: `import { StorageBox } from "@storagebox/sdk";

const storagebox = new StorageBox({
  baseUrl: "${apiUrl}",
  apiKey: process.env.STORAGEBOX_KEY!,
  apiSecret: process.env.STORAGEBOX_SECRET!,
});

// Browser: a File from <input type="file">. Node: { data: await readFile(path), filename }
const file = await storagebox.files.upload(myFile, {
  collection: "contracts/2026",
  tags: ["legal", "signed"],
});
console.log(file.publicId, file.url);

// Images: resize / convert straight from the permanent link
const thumbnail = storagebox.url(file, { width: 400, format: "webp" });`,
      python: `import os, requests

auth = (os.environ["STORAGEBOX_KEY"], os.environ["STORAGEBOX_SECRET"])
with open("contract.pdf", "rb") as handle:
    response = requests.post(
        "${apiUrl}/v1/files",
        auth=auth,
        files={"file": handle},
        data={"collection": "contracts/2026", "access": "PRIVATE"},
    )
file = response.json()["data"][0]
print(file["publicId"], file.get("url"))`,
    },
    list: {
      curl: `curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" \\
  "${apiUrl}/v1/files?collection=contracts/2026&kind=document&page=1&pageSize=30"`,
      sdk: `const { items, total } = await storagebox.files.list({
  collection: "contracts/2026",
  kind: "document",
  search: "invoice",
});`,
      python: `response = requests.get(
    "${apiUrl}/v1/files",
    auth=auth,
    params={"collection": "contracts/2026", "kind": "document"},
)
files = response.json()["data"]["items"]`,
    },
    signed: {
      curl: `curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" -H "content-type: application/json" \\
  -d '{"expiresIn":3600,"download":false}' \\
  ${apiUrl}/v1/files/PUBLIC_ID/signed-url`,
      sdk: `const { url, expiresAt } = await storagebox.files.signedUrl("PUBLIC_ID", {
  expiresIn: 3600,          // seconds (60 – 604800)
  transform: "w_600,f_webp", // optional, images only
});`,
      python: `response = requests.post(
    "${apiUrl}/v1/files/PUBLIC_ID/signed-url",
    auth=auth,
    json={"expiresIn": 3600},
)
url = response.json()["data"]["url"]`,
    },
    remove: {
      curl: `curl -u "$STORAGEBOX_KEY:$STORAGEBOX_SECRET" -X DELETE ${apiUrl}/v1/files/PUBLIC_ID`,
      sdk: `await storagebox.files.delete("PUBLIC_ID");`,
      python: `requests.delete("${apiUrl}/v1/files/PUBLIC_ID", auth=auth)`,
    },
  };
}
