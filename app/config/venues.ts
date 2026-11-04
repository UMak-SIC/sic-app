import type { ComboboxOption } from "@/components/ui/typeable-combobox";

/**
 * Standard university venues to prevent typos and misspellings in event locations.
 * The TypeableCombobox allows selecting any of these standard presets or entering a
 * custom classroom / room number when needed.
 */
export const UMAK_VENUES: ComboboxOption[] = [
  {
    value: "Grand Amphitheater (Admin Bldg)",
    label: "Grand Amphitheater (Admin Bldg)",
    description: "Admin Building, Ground Floor",
  },
  {
    value: "University Auditorium (Admin Bldg)",
    label: "University Auditorium (Admin Bldg)",
    description: "Admin Building",
  },
  {
    value: "University Gymnasium (HPSB)",
    label: "University Gymnasium (HPSB)",
    description: "Health and Physical Science Building",
  },
  {
    value: "University Oval / Track & Field",
    label: "University Oval / Track & Field",
    description: "Athletic Grounds",
  },
  {
    value: "CCIS Computer Laboratory 1",
    label: "CCIS Computer Laboratory 1",
    description: "College of Computing and Information Sciences",
  },
  {
    value: "CCIS Computer Laboratory 2",
    label: "CCIS Computer Laboratory 2",
    description: "College of Computing and Information Sciences",
  },
  {
    value: "CCIS Computer Laboratory 3",
    label: "CCIS Computer Laboratory 3",
    description: "College of Computing and Information Sciences",
  },
  {
    value: "CCIS Multimedia Room",
    label: "CCIS Multimedia Room",
    description: "Admin Building 5th Floor",
  },
  {
    value: "Mini Theater (Admin Bldg)",
    label: "Mini Theater (Admin Bldg)",
    description: "Admin Building",
  },
  {
    value: "University Library AVR",
    label: "University Library AVR",
    description: "Main Library Building",
  },
  {
    value: "Online (Zoom / Google Meet)",
    label: "Online (Zoom / Google Meet)",
    description: "Virtual conference link",
  },
];
