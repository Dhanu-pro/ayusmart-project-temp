"use client";

import dynamic from "next/dynamic";

const ClinicMap = dynamic(
  () => import("./ClinicMap.client"),
  { ssr: false }
);

export default ClinicMap;