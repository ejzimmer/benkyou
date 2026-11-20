const BASE_URL = 'https://api.wanikani.com/v2';

export type Resource<T> = {
  id: number;
  object: string;
  data: T;
};

type Collection<T> = {
  data_updated_at: string | null;
  pages: { next_url: string | null };
  data: Resource<T>[];
};

export class InvalidApiKeyError extends Error {}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Wanikani-Revision': '20170710',
    },
  });
  if (response.status === 401) {
    throw new InvalidApiKeyError();
  }
  if (!response.ok) {
    throw new Error(`WaniKani responded with ${response.status}`);
  }
  return response.json();
}

export async function fetchCollection<T>(
  path: string,
  apiKey: string,
): Promise<{ updatedAt: string | null; resources: Resource<T>[] }> {
  const resources: Resource<T>[] = [];
  let updatedAt: string | null = null;
  let url: string | null = `${BASE_URL}/${path}`;

  while (url) {
    const page: Collection<T> = await fetchJson(url, apiKey);
    resources.push(...page.data);
    updatedAt ??= page.data_updated_at;
    url = page.pages.next_url;
  }

  return { updatedAt, resources };
}

export async function fetchUserLevel(apiKey: string): Promise<number> {
  const user = await fetchJson<{ data: { level: number } }>(
    `${BASE_URL}/user`,
    apiKey,
  );
  return user.data.level;
}
