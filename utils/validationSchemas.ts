/**
 * Shared validation schemas loader
 * Loads validation patterns and rules from shared JSON schema
 */
import validationSchemas from '../../shared_validation_schemas.json';

export interface ValidationPattern {
  pattern: RegExp;
  message: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'curp' | 'phone' | 'pattern' | 'minLength' | 'maxLength';
  message: string;
  value?: any;
  pattern?: RegExp;
}

export interface FieldConstraint {
  min_length?: number;
  max_length?: number;
  length?: number;
}

class ValidationSchemaLoader {
  private schemas = validationSchemas;
  private patterns: Map<string, RegExp> = new Map();
  private language: 'es' | 'en' = 'es';

  constructor() {
    this.loadPatterns();
  }

  private loadPatterns(): void {
    Object.entries(this.schemas.patterns).forEach(([key, pattern]) => {
      this.patterns.set(key, new RegExp(pattern));
    });
  }

  /**
   * Get compiled regex pattern by name
   */
  getPattern(name: string): RegExp | undefined {
    return this.patterns.get(name);
  }

  /**
   * Get validation message
   */
  getMessage(key: string, params?: Record<string, any>): string {
    let message = this.schemas.messages[this.language][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        message = message.replace(`{${param}}`, String(value));
      });
    }
    
    return message;
  }

  /**
   * Get NOM-004 required fields
   */
  getRequiredFields(type: 'patient' | 'consultation'): string[] {
    return this.schemas.nom004_required_fields[type] || [];
  }

  /**
   * Get field constraints
   */
  getFieldConstraints(fieldName: string): FieldConstraint {
    return this.schemas.field_constraints[fieldName] || {};
  }

  /**
   * Get dropdown values
   */
  getDropdownValues(type: string): Array<{value: string, label_es?: string, label_en?: string, label?: string}> {
    return this.schemas.dropdown_values[type] || [];
  }

  /**
   * Validate CURP
   */
  validateCURP(curp: string): boolean {
    if (!curp || curp.length !== 18) return false;
    const pattern = this.getPattern('curp');
    return pattern ? pattern.test(curp.toUpperCase()) : false;
  }

  /**
   * Validate email
   */
  validateEmail(email: string): boolean {
    if (!email) return false;
    const pattern = this.getPattern('email');
    return pattern ? pattern.test(email) : false;
  }

  /**
   * Validate Mexican phone number
   */
  validatePhone(phone: string): boolean {
    if (!phone) return true; // Optional field
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const pattern = this.getPattern('phone_mexico');
    return pattern ? pattern.test(cleanPhone) : false;
  }

  /**
   * Validate professional license
   */
  validateProfessionalLicense(license: string): boolean {
    if (!license) return false;
    const pattern = this.getPattern('professional_license');
    return pattern ? pattern.test(license) : false;
  }

  /**
   * Validate postal code
   */
  validatePostalCode(postalCode: string): boolean {
    if (!postalCode) return true; // Optional field
    const pattern = this.getPattern('postal_code_mexico');
    return pattern ? pattern.test(postalCode) : false;
  }

  /**
   * Get validation rules for a field
   */
  getValidationRules(fieldName: string, isRequired = false): ValidationRule[] {
    const rules: ValidationRule[] = [];
    const constraints = this.getFieldConstraints(fieldName);

    if (isRequired) {
      rules.push({
        type: 'required',
        message: this.getMessage('required')
      });
    }

    // Add specific field validations
    switch (fieldName) {
      case 'email':
        rules.push({
          type: 'email',
          message: this.getMessage('email'),
          pattern: this.getPattern('email')
        });
        break;

      case 'curp':
        rules.push({
          type: 'curp',
          message: this.getMessage('curp'),
          pattern: this.getPattern('curp')
        });
        break;

      case 'phone':
        rules.push({
          type: 'phone',
          message: this.getMessage('phone'),
          pattern: this.getPattern('phone_mexico')
        });
        break;

      case 'professional_license':
        rules.push({
          type: 'pattern',
          message: this.getMessage('professional_license'),
          pattern: this.getPattern('professional_license')
        });
        break;

      case 'postal_code':
        rules.push({
          type: 'pattern',
          message: this.getMessage('postal_code'),
          pattern: this.getPattern('postal_code_mexico')
        });
        break;
    }

    // Add length constraints
    if (constraints.min_length) {
      rules.push({
        type: 'minLength',
        message: this.getMessage('min_length', { min: constraints.min_length }),
        value: constraints.min_length
      });
    }

    if (constraints.max_length) {
      rules.push({
        type: 'maxLength',
        message: this.getMessage('max_length', { max: constraints.max_length }),
        value: constraints.max_length
      });
    }

    return rules;
  }

  /**
   * Set language for messages
   */
  setLanguage(lang: 'es' | 'en'): void {
    this.language = lang;
  }
}

// Export singleton instance
export const validationSchemas = new ValidationSchemaLoader();

// Export convenience constants
export const VALIDATION_PATTERNS = {
  CURP: validationSchemas.getPattern('curp'),
  EMAIL: validationSchemas.getPattern('email'),
  PHONE: validationSchemas.getPattern('phone_mexico'),
  PROFESSIONAL_LICENSE: validationSchemas.getPattern('professional_license'),
  POSTAL_CODE: validationSchemas.getPattern('postal_code_mexico')
};

export const NOM004_REQUIRED_FIELDS = {
  PATIENT: validationSchemas.getRequiredFields('patient'),
  CONSULTATION: validationSchemas.getRequiredFields('consultation')
};

export const MEXICAN_STATES = validationSchemas.getDropdownValues('mexican_states');
export const BLOOD_TYPES = validationSchemas.getDropdownValues('blood_type');
export const GENDER_OPTIONS = validationSchemas.getDropdownValues('gender');
export const CIVIL_STATUS_OPTIONS = validationSchemas.getDropdownValues('civil_status');
