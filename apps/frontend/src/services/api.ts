export async function getSharedAnalysis(token: string) {
  const url = `/api/shared/${token}`;
  console.log("Share URL:", url);
  const response = await fetch(url);
  if (!response.ok) {
    const errText = await response.text();
    console.log("Error response text:", errText);
    throw new Error("This link is invalid or has been removed.");
  }
  return response.json();
}
