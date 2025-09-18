import type { BasicDetails } from './types'

export const nanoid = (size = 8) =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const unique = <T>(arr: T[]) => Array.from(new Set(arr))

export const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const TOKEN_SPLIT_PATTERN = /[@._\s,;|/\\-]+/
const SKILL_TOKEN_SPLIT = /[\s/+,;:()|&-]+/
const ALLOWED_SHORT_SKILLS = new Set(['sql', 'api', 'ux', 'ui', 'qa', 'ai', 'ml', 'ci', 'cd', 'git', 'aws', 'gcp'])
const KNOWN_SKILL_KEYWORDS = new Set([
  'javascript','typescript','js','ts','node','nodejs','node.js','python','java','c','c#','c++','go','golang','php','ruby','rails','scala','swift','objective-c','kotlin','dart','flutter','react','redux','next','nextjs','next.js','angular','vue','svelte','tailwind','bootstrap','sass','less','css','css3','html','html5','graphql','rest','grpc','soap','microservices','docker','kubernetes','terraform','ansible','pulumi','jenkins','gitlab','gitlab ci','github actions','circleci','bitbucket','ci','cd','cicd','ci/cd','devops','jira','confluence','figma','sketch','zeplin','photoshop','illustrator','after effects','premiere','xd','storybook','webpack','vite','babel','eslint','prettier','vitest','jest','mocha','chai','sinon','cypress','playwright','selenium','webdriverio','appium','pytorch','tensorflow','keras','numpy','pandas','scikit-learn','matplotlib','seaborn','plotly','airflow','spark','hadoop','hive','pig','flink','kafka','rabbitmq','redis','elasticsearch','logstash','kibana','splunk','prometheus','grafana','datadog','new relic','tableau','powerbi','looker','snowflake','bigquery','redshift','mongodb','postgres','postgresql','mysql','mariadb','sqlite','dynamodb','cosmosdb','aurora','oracle','sql server','nosql','neo4j','janusgraph','aws','azure','gcp','lambda','serverless','cloudfront','s3','ec2','eks','elastic beanstalk','cloudformation','cloudwatch','appsync','athena','glue','step functions','cloud run','cloud functions','datastore','bigtable','pubsub','spanner','firestore','firebase','docker compose','helm','istio','linkerd','consul','vault','openapi','swagger','postman','insomnia','jira','asana','notion','monday','powerapps','sharepoint','salesforce','sap','servicenow','workday','shopify','magento','woocommerce','drupal','wordpress','joomla','spark','databricks','vertex ai','sage','qlik','qlikview','qliksense','ssis','ssrs','ssas'])
const GENERIC_NON_SKILLS = new Set([
  'gmail',
  'google',
  'outlook',
  'hotmail',
  'icloud',
  'protonmail',
  'email',
  'phone',
  'mobile',
  'contact',
  'linkedin',
  'github',
  'portfolio',
  'resume',
  'curriculum',
  'vitae',
  'cv',
  'present',
  'remote',
  'onsite',
  'london',
  'united',
  'kingdom',
  'india',
  'usa',
  'holding',
  'private',
  'limited',
  'llc',
  'pte',
  'com',
  'inc',
  'team',
  'client',
  'clients',
  'work',
  'visa',
  'senior',
  'frontend',
  'engineer',
  'developer',
  'location',
  'city',
  'country',
  'teamwork',
  'collaboration',
  'experience',
  'summary',
  'with',
  'years',
  'expertise',
  'building',
  'scalable',
  'automation',
])

export function containsContactNoise(value: string): boolean {
  const lower = value.toLowerCase()
  if (/[\w.+-]+@[\w.-]+/.test(lower)) return true
  if (/https?:\/\//.test(lower) || /www\./.test(lower)) return true
  if (/\b(?:gmail|googlemail|yahoo|outlook|hotmail|icloud|protonmail|contact|phone|mobile|tel)\b/.test(lower)) return true
  if (/\b(?:linkedin|github|behance|dribbble|facebook|twitter|instagram)\b/.test(lower)) return true
  const digits = lower.replace(/[^0-9]/g, '')
  if (digits.length >= 7) return true
  return false
}

export function collectContactTokens(basics?: BasicDetails | null): Set<string> {
  const tokens = new Set<string>()
  if (!basics) return tokens

  const ingest = (value?: string | null) => {
    if (!value) return
    value
      .toLowerCase()
      .split(TOKEN_SPLIT_PATTERN)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .forEach((part) => tokens.add(part))
  }

  ingest(basics.fullName)
  ingest(basics.email)

  return tokens
}

export function textContainsToken(text: string, tokens: Set<string>): boolean {
  if (!tokens.size) return false
  return text
    .toLowerCase()
    .split(TOKEN_SPLIT_PATTERN)
    .some((part) => part.length >= 2 && tokens.has(part))
}

export function filterSkillList(skills: string[], basics?: BasicDetails | null): string[] {
  const tokens = collectContactTokens(basics)
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of skills) {
    const skill = raw.trim()
    if (!skill) continue
    const lower = skill.toLowerCase()
    if (tokens.has(lower)) continue
    if (containsContactNoise(skill)) continue
    if (skill.split(/\s+/).some((part) => tokens.has(part.toLowerCase()))) continue
    if (/^[0-9]+$/.test(lower)) continue
    if (GENERIC_NON_SKILLS.has(lower)) continue
    if (lower.length <= 3 && !ALLOWED_SHORT_SKILLS.has(lower)) continue
    const tokenList = lower.split(SKILL_TOKEN_SPLIT).filter(Boolean)
    const hasKnownKeyword = tokenList.some((token) => KNOWN_SKILL_KEYWORDS.has(token))
    const hasUpper = /[A-Z]/.test(skill)
    const hasDigit = /\d/.test(skill)
    if (!hasUpper && !hasDigit && !hasKnownKeyword) continue
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(skill)
  }
  return out
}

export function sanitizeNarrative(value?: string | null, basics?: BasicDetails | null, maxLength = 280): string {
  if (!value) return ''
  let text = value.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (containsContactNoise(text)) return ''
  const tokens = collectContactTokens(basics)
  if (textContainsToken(text, tokens)) return ''
  const lower = text.toLowerCase()
  if (GENERIC_NON_SKILLS.has(lower)) return ''
  const wordCount = text.split(/\s+/).length
  if (wordCount < 3) return ''
  if (wordCount > 55) return ''
  if (/(?:professional summary|seasoned|experienced professional)/i.test(text)) return ''
  if (/\bexperience\b/i.test(text) && !/project/i.test(text)) return ''
  if (text.length > maxLength) {
    const truncated = text.slice(0, maxLength)
    const cleanCut = truncated.replace(/\s+\S*$/, '').trim()
    if (cleanCut.length < 40) return ''
    text = `${cleanCut}…`
  }
  return text
}
