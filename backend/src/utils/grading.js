/**
 * Utility functions for calculating student result totals, grades, grade points, and pass/fail status.
 */

export function calculateGradeAndStatus({
  internalMarks = 0,
  internalMax = 50,
  externalMarks = 0,
  externalMax = 50,
  resultStatus = "Pass"
}) {
  const internal = Number(internalMarks) || 0;
  const external = Number(externalMarks) || 0;
  const maxInt = Number(internalMax) || 50;
  const maxExt = Number(externalMax) || 50;
  
  const totalMarks = Math.min(maxInt + maxExt, Math.max(0, internal + external));
  const maxMarks = maxInt + maxExt;
  const percentage = (totalMarks / maxMarks) * 100;

  // Handle explicit non-numeric statuses
  if (resultStatus === "Absent") {
    return {
      internalMarks: 0,
      externalMarks: 0,
      totalMarks: 0,
      maxMarks,
      grade: "AB",
      gradePoints: 0,
      status: "Absent"
    };
  }

  if (resultStatus === "Withheld") {
    return {
      internalMarks: internal,
      externalMarks: external,
      totalMarks,
      maxMarks,
      grade: "WH",
      gradePoints: 0,
      status: "Withheld"
    };
  }

  // Minimum passing threshold: Total >= 50% AND External >= 40% of external max (or 20/50)
  const minExternalRequired = maxExt * 0.4;
  const isFailed = totalMarks < (maxMarks * 0.5) || external < minExternalRequired;

  if (isFailed || resultStatus === "Fail") {
    return {
      internalMarks: internal,
      externalMarks: external,
      totalMarks,
      maxMarks,
      grade: "F",
      gradePoints: 0,
      status: "Fail"
    };
  }

  let grade = "B";
  let gradePoints = 6.0;

  if (percentage >= 90) {
    grade = "O";
    gradePoints = 10.0;
  } else if (percentage >= 80) {
    grade = "A+";
    gradePoints = 9.0;
  } else if (percentage >= 70) {
    grade = "A";
    gradePoints = 8.0;
  } else if (percentage >= 60) {
    grade = "B+";
    gradePoints = 7.0;
  } else if (percentage >= 50) {
    grade = "B";
    gradePoints = 6.0;
  }

  return {
    internalMarks: internal,
    externalMarks: external,
    totalMarks,
    maxMarks,
    grade,
    gradePoints,
    status: "Pass"
  };
}
