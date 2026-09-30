import { DonutDatum } from "./donut-chart";

export interface DashboardEvent {
  id: number;
  day: number;
  dateFormatted: string;
  monthYear: string;
  title: string;
  location: string;
  participants: number;
  collegeBreakdown: DonutDatum[];
}

export const DASHBOARD_EVENTS: DashboardEvent[] = [
  {
    id: 1,
    day: 15,
    dateFormatted: "May 15, 2024",
    monthYear: "May 2024",
    title: "UMak Tech Summit 2024",
    location: "UMak Grand Theater",
    participants: 250,
    collegeBreakdown: [
      { name: "CCIS", value: 88, color: "var(--cyan, #087f8c)", amount: "88 std" },
      { name: "CBFS", value: 62, color: "var(--green, #2da482)", amount: "62 std" },
      { name: "CAL", value: 42, color: "#176c59", amount: "42 std" },
      { name: "COE", value: 30, color: "var(--amber, #9c6016)", amount: "30 std" },
      { name: "CCJ", value: 16, color: "#607579", amount: "16 std" },
      {
        name: "Other · UMak",
        value: 12,
        color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
        amount: "12 std",
      },
    ],
  },
  {
    id: 2,
    day: 22,
    dateFormatted: "May 22, 2024",
    monthYear: "May 2024",
    title: "Leadership Conclave 2024",
    location: "Admin Bldg Auditorium",
    participants: 150,
    collegeBreakdown: [
      { name: "CBFS", value: 55, color: "var(--green, #2da482)", amount: "55 std" },
      { name: "CAL", value: 38, color: "#176c59", amount: "38 std" },
      { name: "CCIS", value: 25, color: "var(--cyan, #087f8c)", amount: "25 std" },
      { name: "CGPP", value: 18, color: "var(--amber, #9c6016)", amount: "18 std" },
      { name: "COE", value: 10, color: "#607579", amount: "10 std" },
      {
        name: "Other · UMak",
        value: 4,
        color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
        amount: "4 std",
      },
    ],
  },
  {
    id: 3,
    day: 28,
    dateFormatted: "May 28, 2024",
    monthYear: "May 2024",
    title: "SIC Innovation Showcase",
    location: "CCIS Lab 402",
    participants: 180,
    collegeBreakdown: [
      { name: "CCIS", value: 95, color: "var(--cyan, #087f8c)", amount: "95 std" },
      { name: "COE", value: 40, color: "var(--amber, #9c6016)", amount: "40 std" },
      { name: "CBFS", value: 25, color: "var(--green, #2da482)", amount: "25 std" },
      { name: "CAL", value: 12, color: "#176c59", amount: "12 std" },
      {
        name: "Other · UMak",
        value: 8,
        color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
        amount: "8 std",
      },
    ],
  },
];
