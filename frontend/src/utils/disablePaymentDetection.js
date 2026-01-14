// Disable payment method detection for insurance fields
export const disablePaymentDetection = () => {
  // Find all insurance-related input fields
  const insuranceFields = document.querySelectorAll(
    'input[name="medical_insurance_code"], input[name="insurance_number"], input[aria-label*="seguro"]'
  );

  insuranceFields.forEach(field => {
    // Force disable autofill and payment detection
    field.setAttribute('autocomplete', 'new-password');
    field.setAttribute('data-lpignore', 'true');
    field.setAttribute('data-1p-ignore', 'true');
    field.setAttribute('data-bwignore', 'true');
    field.setAttribute('data-autofill', 'off');
    field.setAttribute('data-form-type', 'other');
    field.setAttribute('autocapitalize', 'off');
    field.setAttribute('autocorrect', 'off');
    field.setAttribute('spellcheck', 'false');
    field.setAttribute('type', 'text');
    field.setAttribute('role', 'textbox');
    
    // Prevent browser from showing payment suggestions
    field.addEventListener('focus', (e) => {
      e.target.setAttribute('autocomplete', 'new-password');
      e.target.setAttribute('data-lpignore', 'true');
    });
    
    // Override any browser payment detection
    field.addEventListener('input', (e) => {
      e.target.setAttribute('autocomplete', 'new-password');
    });
  });
};

// Auto-disable on page load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', disablePaymentDetection);
  // Also run after a short delay to catch dynamically loaded content
  setTimeout(disablePaymentDetection, 1000);
}


