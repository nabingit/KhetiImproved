export interface WageValidationResult {
  canModify: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  reason?: string;
  minWage?: number;
  maxWage?: number;
}

export class WageValidator {
  /**
   * Validates if wage changes are allowed for a job
   */
  static validateWageChange(
    currentWage: number,
    newWage: number,
    hasApplications: boolean,
    acceptedWorkers: number = 0
  ): WageValidationResult {
    // If no applications exist, any wage change is allowed
    if (!hasApplications) {
      return {
        canModify: true,
        canIncrease: true,
        canDecrease: true
      };
    }

    // If applications exist, no wage changes are allowed
    if (hasApplications) {
      if (newWage !== currentWage) {
        const reason = 'Cannot change wage when applications exist. Workers applied based on the original wage amount, and changing it now would be unfair and disruptive to the application process.';
        
        return {
          canModify: false,
          canIncrease: false,
          canDecrease: false,
          reason,
          minWage: currentWage,
          maxWage: currentWage
        };
      }
    }

    // If wage is the same, it's allowed
    return {
      canModify: true,
      canIncrease: false,
      canDecrease: false,
      minWage: currentWage,
      maxWage: currentWage
    };
  }

  /**
   * Gets the minimum allowed wage for a job
   */
  static getMinimumWage(originalWage: number, hasApplications: boolean): number {
    return hasApplications ? originalWage : 1;
  }

  /**
   * Gets the maximum allowed wage for a job
   */
  static getMaximumWage(originalWage: number, hasApplications: boolean): number {
    return hasApplications ? originalWage : 999999;
  }

  /**
   * Checks if a specific wage amount is valid
   */
  static isWageValid(
    newWage: number,
    originalWage: number,
    hasApplications: boolean
  ): boolean {
    if (newWage <= 0) return false;
    if (hasApplications && newWage !== originalWage) return false;
    return true;
  }

  /**
   * Generates user-friendly error message for wage validation failure
   */
  static getWageErrorMessage(
    currentWage: number,
    newWage: number,
    hasApplications: boolean,
    applicationCount: number
  ): string {
    if (newWage <= 0) {
      return 'Wage must be greater than 0';
    }

    if (!hasApplications) {
      return ''; // No restrictions
    }

    // Any wage change when applications exist
    return `🔒 Wage locked at ₹${currentWage}. Cannot change wage because ${applicationCount} worker${applicationCount !== 1 ? 's have' : ' has'} already applied. Wage modifications are permanently disabled once applications are received.`;

    return '';
  }
}