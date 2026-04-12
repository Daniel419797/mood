"use client";

import { useEffect, useState } from "react";
import { eatingApi } from "@/services/eating";
import { EatingForm } from "@/components/EatingForm";
import { isToday } from "date-fns";

export default function NewEatingPage() {
  const [noLogsToday, setNoLogsToday] = useState(false);

  useEffect(() => {
    eatingApi.list({ limit: 100 }).then((res) => {
      const todayLogs = res.data.data.filter((e) => isToday(new Date(e.loggedAt)));
      setNoLogsToday(todayLogs.length === 0);
    });
  }, []);

  return <EatingForm noLogsToday={noLogsToday} />;
}
