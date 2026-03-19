import { safeFetchJson } from '@/lib/fetch/safeFetch';

type ClinicorpRequestOptions = {
  baseUrl: string;
  apiUsername: string;
  apiToken: string;
};

function buildHeaders(options: ClinicorpRequestOptions): HeadersInit {
  const basic = Buffer.from(`${options.apiUsername}:${options.apiToken}`).toString('base64');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${basic}`,
  };
}

function joinUrl(baseUrl: string, pathname: string, query?: Record<string, string | undefined>) {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${pathname}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function fetchClinicorpSubscribers(options: ClinicorpRequestOptions): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/group/list_subscribers'), {
    headers: buildHeaders(options),
    timeout: 15000,
  });
}

export async function fetchClinicorpBusinesses(options: ClinicorpRequestOptions & { subscriberId: string }): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/business/list', {
    subscriber_id: options.subscriberId,
  }), {
    headers: buildHeaders(options),
    timeout: 20000,
  });
}

export async function fetchClinicorpProfessionals(options: ClinicorpRequestOptions, fromOnlineScheduling = false): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/professional/list_all_professionals', {
    fromOnlineScheduling: fromOnlineScheduling ? 'true' : undefined,
  }), {
    headers: buildHeaders(options),
    timeout: 20000,
  });
}

export async function fetchClinicorpPatients(options: ClinicorpRequestOptions & {
  subscriberId: string;
  patientId?: string;
  name?: string;
  document?: string;
  phone?: string;
  email?: string;
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/patient/get', {
    subscriber_id: options.subscriberId,
    PatientId: options.patientId,
    Name: options.name,
    OtherDocumentId: options.document,
    Phone: options.phone,
    Email: options.email,
  }), {
    headers: buildHeaders(options),
    timeout: 20000,
  });
}

export async function fetchClinicorpAppointments(options: ClinicorpRequestOptions & {
  subscriberId: string;
  dateFrom: string;
  dateTo: string;
  businessId: string;
  patientId?: string;
  includeCanceled?: boolean;
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/appointment/list', {
    subscriber_id: options.subscriberId,
    from: options.dateFrom,
    to: options.dateTo,
    businessId: options.businessId,
    patientId: options.patientId,
    includeCanceled: options.includeCanceled ? 'true' : undefined,
  }), {
    headers: buildHeaders(options),
    timeout: 25000,
  });
}

export async function fetchClinicorpEstimates(options: ClinicorpRequestOptions & {
  subscriberId: string;
  dateFrom: string;
  dateTo: string;
  clinicId?: string;
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/estimates/list', {
    subscriber_id: options.subscriberId,
    from: options.dateFrom,
    to: options.dateTo,
    clinic_id: options.clinicId,
  }), {
    headers: buildHeaders(options),
    timeout: 25000,
  });
}

export async function fetchClinicorpFinancialSummary(options: ClinicorpRequestOptions & {
  subscriberId: string;
  dateFrom: string;
  dateTo: string;
  businessId?: string;
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/financial/list_summary', {
    subscriber_id: options.subscriberId,
    from: options.dateFrom,
    to: options.dateTo,
    business_id: options.businessId,
  }), {
    headers: buildHeaders(options),
    timeout: 25000,
  });
}

export async function pushClinicorpLead(options: ClinicorpRequestOptions & {
  subscriberId: string;
  name: string;
  email: string;
  phone: string;
  boardName?: string | null;
  notes?: string | null;
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/crm/add_leads'), {
    method: 'POST',
    headers: buildHeaders(options),
    timeout: 20000,
    body: JSON.stringify({
      subscriber_id: options.subscriberId,
      Name: options.name,
      Email: options.email,
      Phone: options.phone,
      BoardName: options.boardName ?? undefined,
      Notes: options.notes ?? '',
    }),
  });
}

export async function createClinicorpPurchaseOrder(options: ClinicorpRequestOptions & {
  clinic: string;
  orderCode: string;
  orderDate: string;
  products: unknown[];
}): Promise<unknown> {
  return await safeFetchJson(joinUrl(options.baseUrl, '/products/orders'), {
    method: 'POST',
    headers: buildHeaders(options),
    timeout: 25000,
    body: JSON.stringify({
      clinic: options.clinic,
      orderCode: options.orderCode,
      orderDate: options.orderDate,
      products: options.products,
    }),
  });
}

export async function runClinicorpHealthcheck(options: ClinicorpRequestOptions & { subscriberId: string }) {
  const subscribers = await fetchClinicorpSubscribers(options);
  const businesses = await fetchClinicorpBusinesses(options);
  const subscriberCount = Array.isArray(subscribers) ? subscribers.length : 0;
  const businessCount = Array.isArray(businesses) ? businesses.length : 0;
  return {
    ok: true as const,
    subscriberCount,
    businessCount,
  };
}
