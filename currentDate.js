exports.getDateToday = function () {
  const todayDate = new Date();
  const dateTimeString = todayDate.toLocaleString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
  return dateTimeString;
};

exports.getDay = function () {
  const todayDate = new Date();
  const dayName = todayDate.toLocaleString("en-us", {
    weekday: "long",
    
  });
  return dayName;
};
