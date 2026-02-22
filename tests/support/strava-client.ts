import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

type TokenOptions = {
  requireActivityReadPermission?: boolean;
};

type PermissionCheckResult = {
  ok: boolean;
  missingField?: string;
  status?: number;
};

export class StravaClient {
  static async refreshAccessToken(): Promise<string> {
    const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    console.log('-> Refreshing access token...');

    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    this.updateEnvFile(newAccessToken, newRefreshToken);

    console.log('[OK] Access token refreshed and saved to .env');

    return newAccessToken;
  }

  static async validateToken(token: string): Promise<boolean> {
    try {
      await axios.get('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return false;
      }
      throw error;
    }
  }

  static async getValidAccessToken(options: TokenOptions = {}): Promise<string> {
    let accessToken = process.env.STRAVA_ACCESS_TOKEN || '';

    const isValid = await this.validateToken(accessToken);

    if (!isValid) {
      console.log('[WARN] Access token expired, refreshing...');
      accessToken = await this.refreshAccessToken();
      process.env.STRAVA_ACCESS_TOKEN = accessToken;
    } else {
      console.log('[OK] Access token is valid');
    }

    if (options.requireActivityReadPermission) {
      accessToken = await this.ensureActivityReadPermission(accessToken);
    }

    return accessToken;
  }

  private static async ensureActivityReadPermission(accessToken: string): Promise<string> {
    const initialCheck = await this.checkActivityReadPermission(accessToken);

    if (initialCheck.ok) {
      return accessToken;
    }

    if (initialCheck.missingField === 'activity:read_permission') {
      console.log('[WARN] Missing activity read permission on access token, attempting refresh...');
      const refreshedToken = await this.refreshAccessToken();
      process.env.STRAVA_ACCESS_TOKEN = refreshedToken;

      const refreshedCheck = await this.checkActivityReadPermission(refreshedToken);
      if (refreshedCheck.ok) {
        return refreshedToken;
      }

      if (refreshedCheck.missingField === 'activity:read_permission') {
        throw new Error(this.buildMissingActivityScopeMessage());
      }

      throw new Error(
        `Activities endpoint still unauthorized after token refresh (status ${refreshedCheck.status ?? 'unknown'}).`
      );
    }

    throw new Error(
      `Could not verify activity read permission (status ${initialCheck.status ?? 'unknown'}).`
    );
  }

  private static async checkActivityReadPermission(accessToken: string): Promise<PermissionCheckResult> {
    try {
      await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 1 }
      });

      return { ok: true };
    } catch (error: any) {
      const status = error.response?.status;
      const missingField = error.response?.data?.errors?.[0]?.field;

      if (status === 401 && missingField === 'activity:read_permission') {
        return { ok: false, status, missingField };
      }

      return { ok: false, status };
    }
  }

  private static buildMissingActivityScopeMessage(): string {
    const clientId = process.env.STRAVA_CLIENT_ID || '<your_client_id>';
    const redirectUri = process.env.STRAVA_REDIRECT_URI || 'http://localhost/exchange_token';
    const query = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      approval_prompt: 'force',
      scope: 'read,activity:read_all'
    });
    const authorizationUrl = `https://www.strava.com/oauth/authorize?${query.toString()}`;

    return [
      'Strava token is missing required scope: activity:read_permission.',
      'Re-authorize the app with activity scopes and update STRAVA_ACCESS_TOKEN/STRAVA_REFRESH_TOKEN in .env.',
      `Authorization URL: ${authorizationUrl}`
    ].join(' ');
  }

  private static updateEnvFile(newAccessToken: string, newRefreshToken: string): void {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    envContent = envContent.replace(
      /STRAVA_ACCESS_TOKEN=.*/,
      `STRAVA_ACCESS_TOKEN=${newAccessToken}`
    );
    envContent = envContent.replace(
      /STRAVA_REFRESH_TOKEN=.*/,
      `STRAVA_REFRESH_TOKEN=${newRefreshToken}`
    );

    fs.writeFileSync(envPath, envContent);
  }
}
