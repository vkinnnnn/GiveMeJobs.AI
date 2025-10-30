# Accessibility Quick Reference Guide

**For Developers:** Quick tips and common patterns for maintaining accessibility

---

## Quick Checks Before Committing

- [ ] All images have descriptive `alt` text
- [ ] All buttons and links have clear, descriptive text
- [ ] Form inputs have associated labels
- [ ] Color contrast meets 4.5:1 ratio (use darker shades)
- [ ] Keyboard navigation works (test with Tab key)
- [ ] Focus indicators are visible
- [ ] ARIA attributes are used correctly
- [ ] Run `npm run test:a11y` and ensure all tests pass

---

## Common Patterns

### Buttons

```tsx
// ✅ Good - Descriptive text
<button onClick={handleSave}>Save Changes</button>

// ✅ Good - Icon with aria-label
<button onClick={handleDelete} aria-label="Delete item">
  <TrashIcon />
</button>

// ❌ Bad - No text or label
<button onClick={handleDelete}>
  <TrashIcon />
</button>
```

### Images

```tsx
// ✅ Good - Descriptive alt text
<img src="profile.jpg" alt="John Doe's profile picture" />

// ✅ Good - Decorative image
<img src="decoration.svg" alt="" aria-hidden="true" />

// ❌ Bad - Missing alt text
<img src="profile.jpg" />
```

### Form Inputs

```tsx
// ✅ Good - Label associated with input
<label htmlFor="email">Email Address</label>
<input id="email" type="email" required />

// ✅ Good - Error message
<input
  id="email"
  type="email"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && <span id="email-error">Email is required</span>}

// ❌ Bad - No label
<input type="email" placeholder="Email" />
```

### Links

```tsx
// ✅ Good - Descriptive link text
<a href="/profile">View your profile</a>

// ✅ Good - External link indication
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Visit Example.com <span className="sr-only">(opens in new tab)</span>
</a>

// ❌ Bad - Generic link text
<a href="/profile">Click here</a>
```

### Headings

```tsx
// ✅ Good - Logical hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

// ❌ Bad - Skipping levels
<h1>Page Title</h1>
<h3>Section Title</h3> {/* Skipped h2 */}
```

### Modals

```tsx
// ✅ Good - Accessible modal
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure you want to proceed?</p>
</Modal>
```

### Dynamic Content

```tsx
// ✅ Good - Announce changes
const announce = useAnnouncer();

const handleSave = async () => {
  await saveData();
  announce('Changes saved successfully', 'polite');
};

// ✅ Good - Live region
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

---

## Color Contrast

### Recommended Colors (WCAG AA Compliant)

**Text on White Background:**
- Primary text: `#1f2937` (gray-800) - 12.6:1 ✅
- Secondary text: `#4b5563` (gray-600) - 7.0:1 ✅
- Links: `#2563eb` (blue-600) - 7.0:1 ✅
- Error: `#dc2626` (red-600) - 5.9:1 ✅
- Success: `#15803d` (green-700) - 4.5:1 ✅
- Warning: `#ca8a04` (yellow-600) - 4.5:1 ✅

**Button Colors:**
- Primary button: `#2563eb` (blue-600) with white text - 4.6:1 ✅
- Danger button: `#dc2626` (red-600) with white text - 5.9:1 ✅
- Success button: `#15803d` (green-700) with white text - 4.5:1 ✅

**Avoid:**
- `#3b82f6` (blue-500) with white text - 3.7:1 ❌
- `#16a34a` (green-600) with white text - 3.3:1 ❌
- Light colors on white background

---

## Keyboard Navigation

### Essential Keys to Support

- **Tab** - Move to next focusable element
- **Shift+Tab** - Move to previous focusable element
- **Enter** - Activate buttons and links
- **Space** - Activate buttons and checkboxes
- **Escape** - Close modals and dropdowns
- **Arrow keys** - Navigate within components (lists, menus)

### Testing Checklist

1. Can you reach all interactive elements with Tab?
2. Is the focus indicator clearly visible?
3. Does Tab order follow visual order?
4. Can you activate elements with Enter/Space?
5. Can you close modals with Escape?
6. Are there any keyboard traps?

---

## ARIA Attributes

### Common ARIA Attributes

```tsx
// Labels
aria-label="Close dialog"
aria-labelledby="heading-id"

// Descriptions
aria-describedby="description-id"

// States
aria-expanded={isOpen}
aria-selected={isSelected}
aria-checked={isChecked}
aria-disabled={isDisabled}
aria-invalid={hasError}
aria-current="page"

// Live regions
aria-live="polite" // or "assertive"
aria-atomic="true"

// Hidden content
aria-hidden="true"

// Roles (use sparingly, prefer semantic HTML)
role="button"
role="dialog"
role="alert"
```

### When to Use ARIA

1. **Use semantic HTML first** - `<button>` instead of `<div role="button">`
2. **Use ARIA when semantic HTML isn't enough** - Custom components
3. **Never use ARIA to fix bad HTML** - Fix the HTML instead
4. **Test with screen readers** - Ensure ARIA works as expected

---

## Screen Reader Only Content

```tsx
// Hide visually but keep for screen readers
<span className="sr-only">Additional context for screen readers</span>

// CSS for sr-only class (already in globals.css)
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Testing Tools

### Automated Testing

```bash
# Run accessibility tests
npm run test:a11y

# Watch mode
npm run test:watch
```

### Browser Extensions

- **axe DevTools** - Comprehensive accessibility testing
- **WAVE** - Visual accessibility evaluation
- **Lighthouse** - Performance and accessibility audit
- **Color Contrast Analyzer** - Check color contrast ratios

### Screen Readers

- **NVDA** (Windows) - Free, recommended for testing
- **VoiceOver** (macOS) - Built-in, Cmd+F5 to enable
- **VoiceOver** (iOS) - Built-in, Settings > Accessibility
- **TalkBack** (Android) - Built-in, Settings > Accessibility

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Missing alt text
<img src="logo.png" />

// Div as button
<div onClick={handleClick}>Click me</div>

// Placeholder as label
<input type="email" placeholder="Email" />

// Generic link text
<a href="/more">Read more</a>

// Color only for errors
<span style={{ color: 'red' }}>Error</span>

// Skipping heading levels
<h1>Title</h1>
<h3>Subtitle</h3>

// No focus indicator
button:focus { outline: none; }
```

### ✅ Do This Instead

```tsx
// Descriptive alt text
<img src="logo.png" alt="GiveMeJobs logo" />

// Semantic button
<button onClick={handleClick}>Click me</button>

// Proper label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Descriptive link text
<a href="/more">Read more about our services</a>

// Error with icon and text
<span className="text-red-600">
  <ErrorIcon aria-hidden="true" />
  <span>Error: Email is required</span>
</span>

// Logical heading hierarchy
<h1>Title</h1>
<h2>Subtitle</h2>

// Visible focus indicator
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

---

## Resources

### Documentation
- `ACCESSIBILITY_AUDIT.md` - Full audit report
- `SCREEN_READER_TESTING.md` - Screen reader testing guide
- `WCAG_COMPLIANCE_CHECKLIST.md` - WCAG 2.1 checklist

### External Resources
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Getting Help

### Questions?
- Check the documentation files in this directory
- Review the automated tests for examples
- Test with screen readers
- Ask the team for guidance

### Found an Issue?
1. Document the issue clearly
2. Include steps to reproduce
3. Note which WCAG criterion is affected
4. Suggest a fix if possible
5. Create a ticket and assign to the team

---

**Remember:** Accessibility is not optional. It's a requirement for all features.

