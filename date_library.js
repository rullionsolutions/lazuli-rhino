/*global x, java */
"use strict";

Date.preferAmericanFormat = false;

/*
 From date_format.js ...

getFullYear()
parseString(val, format)    static
isValid(val,format)         static
isBefore(date2)
isAfter(date2)
equals(date2)
equalsIgnoreTime(date2)
format(format)
getDayName()
getDayAbbreviation()            // 3-letter abbrev
getMonthName()
getMonthAbbreviation()          // 3-letter abbrev
clearTime()
add(interval, number)           // interval is one of: 'y'ear, 'M'onth, 'd'ay, 'w'eekday, 'h'our, 'm'inute, 's'econd


*/

// date2 - this, to be anti-commutative (exchanging this and arg should only reverse the result's sign) and semi-inclusive (date.daysBetween(date) === 0)
Date.prototype.daysBetween = function (date2) {
    return Math.round((date2.getTime() - this.getTime()) / (1000 * 60 * 60 * 24));
};

// date2 - this, to be non-commutative (if this > arg returns -1) and inclusive (date.daysBetween(date) === 1)
Date.prototype.workingDaysBetween = function (date2, exclude_bank_holidays) {
    var weeks,
        date_diff,
        weekday1,
        weekday2,
        adjust = 0;

    if (date2 < this) {
        return -1;                 // error code if dates transposed
    }
    weekday1 = this .getDay();                // day of week
    weekday2 = date2.getDay();
    weekday1 = (weekday1 === 0) ? 7 : weekday1;   // change Sunday from 0 to 7
    weekday2 = (weekday2 === 0) ? 7 : weekday2;

    if ((weekday1 > 5) && (weekday2 > 5)) {
        adjust = 1;  // adjustment if both days on weekend
    }
    weekday1 = (weekday1 > 5) ? 5 : weekday1;    // only count weekdays
    weekday2 = (weekday2 > 5) ? 5 : weekday2;
    // calculate differnece in weeks (1000mS * 60sec * 60min * 24hrs * 7 days = 604800000)
    weeks = Math.floor((date2.getTime() - this.getTime()) / 604800000);
    if (weekday1 <= weekday2) {
        date_diff = (weeks * 5) + (weekday2 - weekday1);
    } else {
        date_diff = ((weeks + 1) * 5) - (weekday1 - weekday2);
    }
    date_diff -= adjust; // take into account both days on weekend

    date_diff += 1;      // add 1 because dates are inclusive

    if (exclude_bank_holidays && Date.bank_holidays) {
        date_diff -= this.getBankHolidaysBetween(date2);
    }

    return date_diff;
};

Date.prototype.getBankHolidaysBetween = function (date2) {
    return this.getBankHolidaysArrayBetween(date2).length;
};

Date.prototype.getBankHolidaysArrayBetween = function (date2) {
    var that = this,
        holidays_filter = function (holiday_dt) {
            var dt = Date.parse(holiday_dt);
            return dt.isWeekDay() && dt.isBetweenDates(that, date2);
        };

    date2 = date2 || this;

    return Object.keys(Date.bank_holidays) //get the array of holidays dates
                 .filter(holidays_filter);  //filter the dates that are not in range
};

Date.prototype.isWeekDay = function () {
    var day = this.getDay();
    return day !== 0 && day !== 6;
};

Date.prototype.isWeekendDay = function () {
    return !this.isWeekDay();
};

Date.prototype.isBankHoliday = function () {
     return Date.bank_holidays.hasOwnProperty(this.format("yyyy-MM-dd"));
};

//Date.prototype.addWorkingDays = function (working_days) {
//    var test_dt,
//        days_diff,
//        days_to_add;
//
//    test_dt = this.copy().add("d", working_days);
//    days_to_add = working_days;
//    do {
//        days_diff = working_days - this.workingDaysBetween(test_dt, true);
//        days_to_add += days_diff;
//        if (days_diff) {
//            test_dt.add("d", days_diff);
//        }
//    } while(days_diff > 0);
//
//    return this.add("d", days_to_add > 0 ? days_to_add : 0);
//};

//C7070 Fix - The version above was a day off in many cases and returned dates at the weekend
Date.prototype.addWorkingDays = function (working_days) {
    var test_dt,
        days_diff;

    test_dt = this.copy().add("d", working_days);
    days_diff = working_days - (this.workingDaysBetween(test_dt, true) - 1);
    while (days_diff > 0) {
        days_diff = working_days - (this.workingDaysBetween(test_dt, true) - 1);
        if (days_diff) {
            test_dt.add("d", days_diff);
        }
    }

    return test_dt;
};

//Check if a date object is between two date objects
Date.prototype.isBetweenDates = function(date_from, date_to, exclude_from_to, use_time) {
    var date_compare_function = use_time ? "equals" : "equalsIgnoreTime";
    return !! (this && date_from && date_to)
           && (this.isAfter(date_from) || (!exclude_from_to && this[date_compare_function](date_from)))
           && (this.isBefore( date_to) || (!exclude_from_to && this[date_compare_function](  date_to)));
};

Date.prototype.copy = function () {
    var date = new Date();
    date.setTime(this.getTime());
    return date;
};

Date.prototype.display = function () {
    return this.format("dd/MM/yy");
};

Date.prototype.internal = function () {
    return this.format("yyyy-MM-dd");
};

Date.parseDateTime = function (str) {
    var date,
        parts;

    if (typeof str !== "string") {
        return str;
    }
    parts = str.split(" ");
    if (parts.length > 0) {
        date = Date.parseString(parts[0]);
    }
    if (date && parts.length > 1) {
        date.parseTime(parts[1]);
    }
    return date;
};

Date.prototype.parseTime = function (str) {
    var parts = str.match(/([0-9]+):([0-9]+):([0-9]+)/);
    if (!parts) {
        return;
    }
    if (parts.length > 1) {
        this.setHours(  parseInt(parts[1], 10));
    }
    if (parts.length > 2) {
        this.setMinutes(parseInt(parts[2], 10));
    }
    if (parts.length > 3) {
        this.setSeconds(parseInt(parts[3], 10));
    }
};

// analogous to add()
Date.prototype.parse = function (str) {
    var parts,
        i,
        datetime;
    if (typeof str !== "string") {
        return str;
    }
    parts = str.split("+");
    for (i = 0; i < parts.length; i += 1) {
        if (parts[i] === "today") {
            this.setTime((new Date()).getTime());
        } else if (parts[i] === "now") {
            this.setTime((new Date()).getTime());
        } else if (parts[i] === "day-start") {
            this.clearTime();
        } else if (parts[i] === "day-end") {
            this.setHours(23);
            this.setMinutes(59);
            this.setSeconds(59);
            this.setMilliseconds(999);
        } else if (parts[i] === "week-start") {
            this.add('d',   - (this.getDay() % 7));            // getDay() returns 0 for Sun to 6 for Sat
        } else if (parts[i] === "week-end") {
            this.add('d', 6 - (this.getDay() % 7));
        } else if (parts[i] === "month-start") {
            this.setDate(1);
        } else if (parts[i] === "month-end") {
            this.add('M', 1);
            this.setDate(1);
            this.add('d', -1);
        } else if (parts[i].indexOf("minutes") > -1) {
            this.add('m', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("hours") > -1) {
            this.add('h', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("days") > -1) {
            this.add('d', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("weeks") > -1) {
            this.add('d', parseInt(parts[i], 10) * 7);
        } else if (parts[i].indexOf("months") > -1) {
            this.add('M', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("years") > -1) {
            this.add('y', parseInt(parts[i], 10));
        } else if (parseInt(parts[i], 10).toFixed(0) === parts[i]) {
            this.add('d', parseInt(parts[i], 10));
        } else if (parts[i].length > 0) {
            datetime = Date.parseDateTime(parts[i]);
            if (datetime) {
                this.setTime(datetime.getTime());
            }
        }
    }
    return this;
};

Date.parse = function (str) {
    var date = new Date();
    date.parse(str);
    return date;
};

Date.prototype.periodBetween = function (date, form, inclusivity) {
    var obj = null,
        str;
    if (date) {
        if (inclusivity === "inclusive") {
            this.add('d', -1);
        } else if (inclusivity === "exclusive") {
            this.add('d',  1);
        }
        if (this.daysBetween(date) === 0) {
            obj = { period: "days", number: 0 };
        } else if (date.getDate() === this.getDate() && date.getMonth() === this.getMonth()) {
            obj = { period: "years" , number: date.getFullYear() - this.getFullYear() };
        } else if (date.getDate() === this.getDate()) {
            obj = { period: "months", number: (date.getFullYear() - this.getFullYear()) * 12 + date.getMonth() - this.getMonth() };
        } else if (this.daysBetween(date) % 7 === 0) {
            obj = { period: "weeks" , number: this.daysBetween(date) / 7 };
        } else {
            obj = { period: "days", number: this.daysBetween(date) };
        }
    }
    if (inclusivity === "inclusive") {              // ensure this remains unchanged at end
        this.add('d',  1);
    } else if (inclusivity === "exclusive") {
        this.add('d', -1);
    }
    if (form === "string") {
        return (obj ? obj.number + "|" + obj.period : "");
    } else if (form === "display") {
        str  = (obj ? obj.number + " " + obj.period : "");
        if (str && obj.number === 1) {
            str = str.replace(/s$/, "");
        }
        return str;
    }
    return obj;
};

Date.prototype.secondsBetween = function (date2) {
// include 2-hour summer time buffer zone
    return x.lib.round((date2.getTime() - this.getTime()) / 1000, 0);
};

// options = { labels: "none"|"short"|"long" default "long", granularity: "s"|"m"|"h"|"d"|"auto" default "auto", zero_time: <string> default "0", delimiter: <string> default " " }
Date.displayTimeInterval = function (seconds, options) {
    var amts = [],
        units = Date.displayTimeInterval.units,
        i,
        temp,
        out = "",
        top_nonzero,
        bot_nonzero,
        bot_show;
    options = options || {};
    options.labels      = options.labels      || "long";
    options.granularity = options.granularity || "auto";
    options.zero_time   = options.zero_time   || "0";
    options.delimiter   = options.delimiter   || " ";
    if (typeof options.decimal_places !== "number") {
        options.decimal_places = 3;
    }
    if (options.labels === "none" && options.granularity === "auto") {
       options.granularity = "s";
    }

    if (seconds < 0) {
       out     = "-";
       seconds = -seconds;
    }
    amts.push(seconds);
//    if (options.granularity === "s") {
//       amts.push(0);
//       amts.push(0);
//       amts.push(0);
//    }

    // calculate initial split of seconds into the units
    for (i = 0; i < units.length - 1; i += 1) {
       temp = amts[i] % units[i + 1][2];
       amts[i + 1] = (amts[i] - temp) / units[i + 1][2];
       amts[i] = temp;
    }

    // apply decimal places to seconds
    amts[0] = amts[0].round(options.decimal_places);

    // work out the highest non-zero unit value (top_nonzero) and the lowest unit to show according to granularity (bot_show)
//    if (options.granularity === "s") {
//       top_nonzero = 3;
//       bot_show = 0;
//    } else {
       for (i = units.length - 1; i >= 0; i -= 1) {
           bot_show = i;
           if (amts[i] !== 0 && typeof top_nonzero !== "number") {
               top_nonzero = i;
           }
           if (options.granularity === units[i][0] /*|| (top_nonzero - bot_show + 1) >= options.granularity*/) {
               bot_nonzero = i;
               break;
           }
       }
//    }

       if (options.full_format) {
           top_nonzero = units.length - 1;
       }

    // if no unit value is non-zero return zero_time
    if (typeof top_nonzero !== "number") {
        return typeof options.zero_time === "string" ? options.zero_time : "0";
    }
    // round unit values from seconds unit up to the lowest shown
    for (i = 0; i < bot_show; i += 1) {
       if (amts[i] > (units[i + 1][2] / 2)) {
           amts[i + 1] += 1;
       }
    }

    // determine the lowest non-zero shown unit value (bot_nonzero)
    if (options.granularity !== "s" && !options.full_format) {
       for (i = top_nonzero; i >= bot_show ; i -= 1) {
           if (amts[i] !== 0) {
               bot_nonzero = i;
           }
       }
    } else {
       bot_nonzero = bot_show;
    }

    // output the unit values from top_nonzero to bot_nonzero
    if (!bot_nonzero) {
        bot_nonzero = bot_show;
    }
    for (i = top_nonzero; i >= bot_nonzero; i -= 1) {
        out += (i < top_nonzero ? options.delimiter : "") +
            ((options.labels === "none" && amts[i] < 10 && amts[i] > -10 && (options.leading_zeros || amts[i] !== 0)) ? "0" : "") +
            amts[i] +
            (options.labels === "none" ? "" : ((options.labels === "short") ? units[i][0] : units[i][1]));
    }

    return out;
};

Date.displayTimeInterval.units = [
    [ "s", " secs",     1 ],
    [ "m", " mins",    60 ],
    [ "h", " hours",   60 ],
    [ "d", " days",    24 ]
];


Date.test = function (funct_name, range) {
    var i,
        j,
        d1 = new Date(),
        d2 = new Date();
    range = range || 10;
    d1.add('d', -range);
    for (i = -range; i < range; i += 1) {
        d2.add('d', -range);
        for (j = -range; j < range; j += 1) {
            print(d1 + " " + d2 + " " + d1[funct_name](d2));
            d2.add('d', 1);
        }
        d1.add('d', 1);
        d2.add('d', -range);
    }
};

Date.prototype.pad = function (value) {
    return value < 10 ? '0' + value : value;
};

Date.prototype.appendUTCOffset = function (date_str) {
    var sign    = (this.getTimezoneOffset() > 0) ? "-" : "+",
        offset  = Math.abs(this.getTimezoneOffset()),
        hours   = this.pad(Math.floor(offset / 60)),
        minutes = this.pad(offset % 60);

    return date_str + (sign + hours + ":" + minutes);
};

Date.prototype.formatWithUTCOffset = function (format) {
    return this.appendUTCOffset(this.format(format));
};