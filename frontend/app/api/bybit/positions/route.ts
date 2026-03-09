import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BYBIT_API_KEY = 'RUqj3bpXzRlrVgIVDa';
const BYBIT_API_SECRET = '0r3Onz3QkvnC3nbZmLZuE1RGt0KctfkdKPn1';
const BYBIT_BASE_URL = 'https://api.bybit.com';

export async function GET() {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const params = 'category=option';
    
    // Signature: timestamp + api_key + recv_window + query_string (no ? or &)
    const signVal = timestamp + BYBIT_API_KEY + recvWindow + params;
    const signature = crypto
      .createHmac('sha256', BYBIT_API_SECRET)
      .update(signVal)
      .digest('hex');

    const url = `${BYBIT_BASE_URL}/v5/position/list?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    
    if (!text) {
      return NextResponse.json({ error: 'Empty response from Bybit' }, { status: response.status });
    }

    const data = JSON.parse(text);
    
    if (data.retCode !== 0) {
      return NextResponse.json(
        { error: data.retMsg || 'Bybit API error' },
        { status: response.status }
      );
    }

    return NextResponse.json(data.result?.list || []);
  } catch (error) {
    console.error('Bybit API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch positions from Bybit' },
      { status: 500 }
    );
  }
}
