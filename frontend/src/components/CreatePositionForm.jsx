import { useState, useId } from 'react';
import './CreatePositionForm.css';

const POSITION_TYPES = [
  { value: 'long_call', label: 'Long Call' },
  { value: 'short_call', label: 'Short Call' },
  { value: 'long_put', label: 'Long Put' },
  { value: 'short_put', label: 'Short Put' },
];

const Icons = {
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
  )
};

function FieldError({ error, id }) {
  if (!error) return null;
  return (
    <span className="error-text" id={id}>
      <Icons.AlertCircle /> {error}
    </span>
  );
}

function CreatePositionForm({ onSubmit, onCancel }) {
  const formId = useId();
  const [formData, setFormData] = useState({
    type: 'long_call',
    symbol: '',
    strike: '',
    expiration: '',
    quantity: '',
    entryPrice: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (data) => {
    const newErrors = {};

    if (!data.type) {
      newErrors.type = 'Position type is required';
    }

    if (!data.symbol || !data.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (!/^[A-Z0-9.]+$/.test(data.symbol.toUpperCase())) {
      newErrors.symbol = 'Invalid symbol format';
    }

    if (!data.strike) {
      newErrors.strike = 'Strike price is required';
    } else {
      const strikeVal = parseFloat(data.strike);
      if (isNaN(strikeVal) || strikeVal <= 0) {
        newErrors.strike = 'Strike must be greater than 0';
      }
    }

    if (!data.expiration) {
      newErrors.expiration = 'Expiration date is required';
    } else {
      const expDate = new Date(data.expiration);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(expDate.getTime())) {
        newErrors.expiration = 'Invalid date';
      } else if (expDate <= today) {
        newErrors.expiration = 'Expiration must be in the future';
      }
    }

    if (!data.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const qtyVal = parseInt(data.quantity);
      if (isNaN(qtyVal) || qtyVal === 0) {
        newErrors.quantity = 'Quantity must be non-zero';
      }
    }

    if (!data.entryPrice) {
      newErrors.entryPrice = 'Entry price is required';
    } else {
      const priceVal = parseFloat(data.entryPrice);
      if (isNaN(priceVal) || priceVal < 0) {
        newErrors.entryPrice = 'Entry price must be non-negative';
      }
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    if (touched[name]) {
      const newErrors = validate(newFormData);
      setErrors(newErrors);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate(formData);
    setErrors(newErrors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate(formData);
    setErrors(newErrors);
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (Object.keys(newErrors).length === 0) {
      onSubmit({
        ...formData,
        symbol: formData.symbol.toUpperCase(),
        strike: parseFloat(formData.strike),
        quantity: parseInt(formData.quantity),
        entryPrice: parseFloat(formData.entryPrice),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-position-form" noValidate>
      <div className="form-header">
        <h3>Create Virtual Position</h3>
        <p className="form-subtitle">Enter the details for your new options position</p>
      </div>

      <div className="form-group">
        <label htmlFor={`${formId}-type`}>Position Type</label>
        <div className="input-wrapper">
          <select
            id={`${formId}-type`}
            name="type"
            value={formData.type}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.type && touched.type ? 'error' : ''}
            aria-invalid={errors.type && touched.type ? 'true' : 'false'}
            aria-describedby={errors.type && touched.type ? `${formId}-type-error` : undefined}
          >
            {POSITION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <FieldError error={touched.type ? errors.type : null} id={`${formId}-type-error`} />
      </div>

      <div className="form-group">
        <label htmlFor={`${formId}-symbol`}>Underlying Symbol</label>
        <div className="input-wrapper">
          <input
            type="text"
            id={`${formId}-symbol`}
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., BTC, ETH"
            className={errors.symbol && touched.symbol ? 'error' : ''}
            aria-invalid={errors.symbol && touched.symbol ? 'true' : 'false'}
            aria-describedby={errors.symbol && touched.symbol ? `${formId}-symbol-error` : undefined}
          />
        </div>
        <FieldError error={touched.symbol ? errors.symbol : null} id={`${formId}-symbol-error`} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${formId}-strike`}>Strike Price</label>
          <div className="input-wrapper">
            <input
              type="number"
              id={`${formId}-strike`}
              name="strike"
              value={formData.strike}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.strike && touched.strike ? 'error' : ''}
              aria-invalid={errors.strike && touched.strike ? 'true' : 'false'}
              aria-describedby={errors.strike && touched.strike ? `${formId}-strike-error` : undefined}
            />
          </div>
          <FieldError error={touched.strike ? errors.strike : null} id={`${formId}-strike-error`} />
        </div>

        <div className="form-group">
          <label htmlFor={`${formId}-expiration`}>Expiration Date</label>
          <div className="input-wrapper">
            <input
              type="date"
              id={`${formId}-expiration`}
              name="expiration"
              value={formData.expiration}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.expiration && touched.expiration ? 'error' : ''}
              aria-invalid={errors.expiration && touched.expiration ? 'true' : 'false'}
              aria-describedby={errors.expiration && touched.expiration ? `${formId}-expiration-error` : undefined}
            />
          </div>
          <FieldError error={touched.expiration ? errors.expiration : null} id={`${formId}-expiration-error`} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${formId}-quantity`}>Quantity</label>
          <div className="input-wrapper">
            <input
              type="number"
              id={`${formId}-quantity`}
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="1"
              step="1"
              className={errors.quantity && touched.quantity ? 'error' : ''}
              aria-invalid={errors.quantity && touched.quantity ? 'true' : 'false'}
              aria-describedby={errors.quantity && touched.quantity ? `${formId}-quantity-error` : undefined}
            />
          </div>
          <FieldError error={touched.quantity ? errors.quantity : null} id={`${formId}-quantity-error`} />
        </div>

        <div className="form-group">
          <label htmlFor={`${formId}-entryPrice`}>Entry Price</label>
          <div className="input-wrapper">
            <input
              type="number"
              id={`${formId}-entryPrice`}
              name="entryPrice"
              value={formData.entryPrice}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.entryPrice && touched.entryPrice ? 'error' : ''}
              aria-invalid={errors.entryPrice && touched.entryPrice ? 'true' : 'false'}
              aria-describedby={errors.entryPrice && touched.entryPrice ? `${formId}-entryPrice-error` : undefined}
            />
          </div>
          <FieldError error={touched.entryPrice ? errors.entryPrice : null} id={`${formId}-entryPrice-error`} />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          <Icons.X /> Cancel
        </button>
        <button type="submit" className="btn-submit">
          <Icons.Plus /> Create Position
        </button>
      </div>
    </form>
  );
}

export default CreatePositionForm;
