// Dropdown time picker with 15-minute steps — much easier than the native
// segmented time input. Emits a plain "HH:MM" string via e.target.value.
const STEP_MINUTES = 15;

const TIMES = [];
for (let h = 0; h < 24; h += 1) {
  for (let m = 0; m < 60; m += STEP_MINUTES) {
    TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const TimeSelect = ({ id, value, onChange, className = "", placeholder = "--:--" }) => {
  // Keep odd legacy values (e.g. "14:37") selectable so they still display.
  const options = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES;

  return (
    <select id={id} className={className} value={value} onChange={onChange}>
      {/* Not disabled: iOS Safari can render a select whose selected option
          is disabled as blank, hiding the whole control's value. */}
      <option value="">{placeholder}</option>
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
};

export default TimeSelect;
