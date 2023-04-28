const data: any = {
  repo: {
    url: "https://github.com/torvalds/linux",
    language: "C",
    license: "Other",
    star_count: 142083,
    created_at: "2011-09-04T22:45:10Z",
    updated_at: "2022-11-21T15:44:03Z",
  },
  legacy: {
    "created_since": 112,
    "updated_since": 21,
    "contributor_count": 3,
    "org_count": 1,
    "commit_frequency": 0,
    "recent_release_count": 0,
    "updated_issues_count": 4,
    "closed_issues_count": 0,
    "issue_comment_frequency": 0.25,
    "github_mention_count": 1
  },
  depsdev: {
    dependent_count: null,
  },
  default_score: 0.92392,
  collection_date: "2022-11-28T02:47:06Z",
};

interface ProjectParams {
  created_since: number;
  updated_since: number;
  contributor_count: number;
  org_count: number;
  commit_frequency: number;
  recent_releases_count: number;
  closed_issues_count: number;
  updated_issues_count: number;
  comment_frequency: number;
  dependents_count: number;
}

function calculateCriticalityScore(params: ProjectParams): number {
  const alpha = [
    120, // max_threshold for created_since
    120, // max_threshold for updated_since
    5000, // max_threshold for contributor_count
    10, // max_threshold for org_count
    1000, // max_threshold for commit_frequency
    26.0, // max_threshold for recent_releases_count
    5000.0, // max_threshold for closed_issues_count
    5000.0, // max_threshold for updated_issues_count
    15, // max_threshold for comment_frequency
    500000, // max_threshold for dependents_count
  ];

  const T = [1, -1, 2, 1, 1, 0.5, 0.5, 0.5, 1, 2];

  let sum_alpha = 0;
  let sum_term = 0;

  for (let i = 0; i < alpha.length; i++) {
    // @ts-ignore
    const S_i = params[Object.keys(params)[i]] as number;

    const max_ST = Math.max(S_i, T[i]);

    const term = alpha[i] * (Math.log(1 + S_i) / Math.log(1 + max_ST));

    sum_alpha += alpha[i];
    sum_term += term || 0;
  }

  return sum_term / sum_alpha;
}

let forDesc: any[] = [];

Object.keys(data.legacy).forEach(k => {
  forDesc.push(`${k} = ${data.legacy[k]}`);
});

console.log("\n");
console.log("// " + forDesc.join(", ") + ". CriticalityScore is: " + calculateCriticalityScore(data.legacy));
console.log("\n");
