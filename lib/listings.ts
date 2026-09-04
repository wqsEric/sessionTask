export const TRADES = ['挖机司机', '装载机司机', '吊车司机', '叉车司机', '推土机司机', '压路机司机', '其他工种'] as const;
export const ENGAGEMENTS = ['临时替班', '短期', '长期', '夜班'] as const;
export const STATUSES = ['active', 'contacting', 'filled', 'closed'] as const;

export type ListingInput = { kind: 'hiring' | 'available'; trade: string; title: string; city: string; district: string; locationDetail?: string; machineType?: string; engagement: string; startDate: string; durationText: string; payText: string; accommodation: string; description: string; contactName: string; contactPhone: string; expiryDays: number };
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function parseListingInput(value: unknown): ListingInput {
  if (!value || typeof value !== 'object') throw new Error('提交内容格式不正确');
  const raw = value as Record<string, unknown>;
  const expiryDays = Number(raw.expiryDays);
  const input: ListingInput = {
    kind: raw.kind === 'available' ? 'available' : 'hiring', trade: clean(raw.trade, 30), title: clean(raw.title, 60), city: clean(raw.city, 30), district: clean(raw.district, 40),
    locationDetail: clean(raw.locationDetail, 80), machineType: clean(raw.machineType, 40), engagement: clean(raw.engagement, 20), startDate: clean(raw.startDate, 20), durationText: clean(raw.durationText, 30),
    payText: clean(raw.payText, 40), accommodation: clean(raw.accommodation, 20), description: clean(raw.description, 500), contactName: clean(raw.contactName, 30), contactPhone: clean(raw.contactPhone, 24),
    expiryDays: [1, 2, 7, 30].includes(expiryDays) ? expiryDays : 2,
  };
  const required: (keyof ListingInput)[] = ['trade', 'title', 'city', 'district', 'engagement', 'startDate', 'durationText', 'payText', 'accommodation', 'description', 'contactName', 'contactPhone'];
  if (required.some((key) => !String(input[key]).trim())) throw new Error('请完整填写必填信息');
  if (!/^[0-9+\-\s]{6,24}$/.test(input.contactPhone)) throw new Error('联系电话格式不正确');
  return input;
}

export function jsonError(message: string, status = 400) { return Response.json({ error: message }, { status }); }
