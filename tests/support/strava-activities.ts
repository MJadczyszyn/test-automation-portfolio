export class StravaActivities {
  
  static validateActivity(activity: any): boolean {
    const requiredFields = ['id', 'name', 'distance', 'moving_time', 'elapsed_time', 'type', 'start_date'];
    
    for (const field of requiredFields) {
      if (!activity.hasOwnProperty(field)) {
        return false;
      }
    }
    
    if (typeof activity.id !== 'number') return false;
    if (typeof activity.name !== 'string') return false;
    if (typeof activity.distance !== 'number') return false;
    if (typeof activity.type !== 'string') return false;
    
    return true;
  }

  static formatActivitySummary(activity: any): string {
    return JSON.stringify({
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      start_date: activity.start_date
    }, null, 2);
  }

  static formatArrayValidation(responseBody: any): string {
    return `Response is array: true, Length: ${responseBody.length}`;
  }

  static validateActivityArray(responseBody: any): void {
    if (!Array.isArray(responseBody)) {
      throw new Error('Response is not an array');
    }
    if (responseBody.length === 0) {
      throw new Error('Response array is empty');
    }
  }
}