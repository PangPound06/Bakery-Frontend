/** รวม className — ข้ามค่าที่เป็น false / null / undefined / "" */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
