var cashParams;
var orderno;
var queryInterval;
var callbackurl;
var timeoutSeconds;
var orderAlias;
var locationInfo;
var payerid;

$('input[type="number"]').on("input", function () {
  this.value = this.value.replace(/[^0-9]/g, "");
  if (this.value.length > 12) {
    this.value = this.value.slice(0, 12);
  }
});

//accordion right chevron
$("#accordions").on("show.bs.collapse", function (e) {
  var currentIndex = $(e.target).data("index");
  $(e.target).prev(".card-header").find(".fas").removeClass("fa-chevron-right").addClass("fa-chevron-down");
  $(".collapse")
    .not(e.target)
    .each(function () {
      $(this).prev(".card-header").find(".fas").removeClass("fa-chevron-down").addClass("fa-chevron-right");
    });

  if (currentIndex == 2) {
    $("#toputrback").css("display", "none");
  } else {
    $("#toputrback").css("display", "block");
  }
});

$("#accordions").on("hide.bs.collapse", function (e) {
  $(e.target).prev(".card-header").find(".fas").removeClass("fa-chevron-down").addClass("fa-chevron-right");
});

//copy btn
$(".copybtn").on("click", function () {
  var textToCopy = cashParams.payee_upi;
  var $temp = $("<textarea>");
  $("body").append($temp);
  $temp.val(textToCopy).select();

  if (document.execCommand("copy")) {
    toast("Copy successful");
  } else {
    toast("Copy failed");
  }

  $temp.remove();
});

$("#utrModal").on("shown.bs.modal", function () {
  $("#utrModal").trigger("focus");
});

//return app
$(".returnapp").on("click", function () {
  window.location.href = callbackurl;
});

//submit Utr
$(".submitUtr").on("click", function () {
  var inputValue = $(this).siblings(".utrinput").val();
  if (inputValue.length < 12) {
    toast("Please enter a valid UTR number", 3000);
    return;
  }
  var dataToSend = {
    orderno: orderno,
    utr: inputValue,
  };

  ServerAPI.postData("/mcapi/cash/backfillutr", dataToSend, function (err, response) {
    if (err) {
      console.error("Error fetching location:", err);
    } else if (response.code === 200) {
      $("#utrModal").modal("show");
    } else {
      toast(response.errmsg, 3000);
    }
  });
});

//pay button animation
$('Button[type="submit"]').on("click", function () {
  var btntext = $(this).html();
  var $this = $(this);
  if ($this.hasClass("active") || $this.hasClass("success")) {
    return false;
  }
  $this.addClass("active");
  setTimeout(function () {
    $this.addClass("loader");
  }, 100);
  setTimeout(function () {
    $this.removeClass("loader active");
    $this.html("success");
    $this.addClass("success");
  }, 1500);
  setTimeout(function () {
    $this.html(btntext);
    $this.removeClass("success");
    $this.removeClass("active");
  }, 2200);
});

//init Cashier
function init() {
  var queryString = window.location.search;
  orderno = queryString.substring(1);
  if (!orderno || orderno === "" || orderno === undefined) {
    queryString = window.location.pathname;
    orderno = queryString.substring(1);
  }
  if (orderno === "" || orderno === undefined) {
    toast("Your order is invalid, please try again.", 5000);
    setTimeout(() => {
      window.location.href = "error.html";
    }, 2000);
    return;
  }
  //新的代码
  try {
    payerid = localStorage.getItem("payerid");
    if (!payerid || payerid === "" || payerid === undefined) {
      payerid = generateRandomString();
      localStorage.setItem("payerid", payerid);
    }
  } catch (error) {
    payerid = "nopayerid";
  }

  // 旧的代码
  //payerid = localStorage.getItem("payerid");
  //if (!payerid || payerid === "" || payerid === undefined) {
  //  payerid = generateRandomString();
  //  localStorage.setItem("payerid", payerid);
  //}


  try {
    var postData = {
      payer_id: payerid,
    };
    ServerAPI.postData("/mcapi/cashplaceorder/v2/" + orderno, postData, function (err, response) {
      if (err) {
        retrycashplaceorder();
        console.error("Error cashplaceorder:", err);
      } else if (response.code === 200) {
        if (response.data.passage_alias !== "self") {
          window.location.href = response.data.upstream_payurl;
          return;
        }
        cashParams = response.data.cash_params;
        timeoutSeconds = response.data.timeout_seconds;
        callbackurl = response.data.callback_url;
        queryOrderStatus(true);
        $("#loading").hide();
        $("#maincontent").show();
      } else {
        retrycashplaceorder();
      }
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function queryOrderStatus(isFirst) {
  ServerAPI.getData("/mcapi/cash/query?orderno=" + orderno, function (err, response) {
    if (err) {
      console.error("Error fetching location:", err);
    } else if (response.code === 200) {
      if (response.data.status === "success") {
        clearInterval(queryInterval);
        window.location.href = "success.html?" + callbackurl;
        return;
      } else if (response.data.status === "timeout") {
        clearInterval(queryInterval);
        window.location.href = "timeout.html?" + callbackurl;
        return;
      }
    }
    if (isFirst) {
      showOrderInfo();
    }
  });
}

function showOrderInfo() {
  new QRCode(document.getElementById("qrcode"), {
    text: cashParams.wakeup_params.qr,
    width: 150,
    height: 150,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
  $("#loading").hide();
  $("#maincontent").show();
  if (
    !cashParams.payment_tool.upi &&
    !cashParams.payment_tool.gpay &&
    !cashParams.payment_tool.phonepe &&
    !cashParams.payment_tool.paytm
  ) {
    $("#wakeupGroup").remove();
  } else {
    if (!cashParams.payment_tool.paytm) {
      $("#wakeuppaytm").remove();
    }
    if (!cashParams.payment_tool.phonepe) {
      $("#wakeupphonepe").remove();
    }
    if (!cashParams.payment_tool.gpay) {
      $("#wakeupgpay").remove();
    }
    if (!cashParams.payment_tool.upi) {
      $("#wakeupupi").remove();
    }
    $("#wakeupGroup").show();
  }

  $("#amount").html(cashParams.amount);
  $("#amount2").html(cashParams.amount);
  $("#amount3").html(cashParams.amount);


  var copyValue = cashParams.payee_upi;
  var atIndex = copyValue.indexOf("@");
  if (atIndex !== -1 && atIndex >= 3) {
    var hiddenValue = copyValue.substring(0, atIndex - 4) + "****" + copyValue.substring(atIndex);

    $("#upi").html(hiddenValue);
  } else {
    $("#upi").html(cashParams.payee_upi);
  }



  if (cashParams.amount >= 2000) {
    $("#headingTwo").click();
  }

  $("#amount3").parent().parent().attr("data-copy", cashParams.amount);
  $("#upi").parent().attr("data-copy", cashParams.payee_upi);

  if (timeoutSeconds < 1) {
    timeoutSeconds = 0;
  }
  startCountdown(timeoutSeconds, function () {
    clearInterval(queryInterval);
    window.location.href = "timeout.html?" + callbackurl;
    return;
  });

  queryInterval = setInterval(() => {
    queryOrderStatus(false);
  }, 5000);
}

function retrycashplaceorder() {
  var qcount = 0;
  var isinloading = false;
  var postData = {
    payer_id: payerid,
  };
  var timer = setInterval(() => {
    if (!isinloading) {
      qcount++;
      isinloading = true;
      $("#loadingcount").html(qcount + "/10");
      if (qcount >= 10) {
        clearInterval(timer);
        window.location.href = "error.html";
        return;
      }
      try {
        ServerAPI.postData("/mcapi/cashplaceorder/v2/" + orderno, postData, function (err, response) {
          isinloading = false;
          if (err) {
            console.error("Error fetching location:", err);
          } else if (response.code === 200) {
            clearInterval(timer);
            cashParams = response.data.cash_params;
            callbackurl = response.data.callback_url;
            timeoutSeconds = response.data.timeout_seconds;
            if (response.data.passage_alias !== "self") {
              window.location.href = response.data.upstream_payurl;
              return;
            }
            queryOrderStatus(true);
            $("#loading").hide();
            $("#maincontent").show();
            return;
          }
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        isinloading = false;
      }
    } else {
      console.log("retrycashplaceorder ok");
    }
  }, 1000);
}

if (window.jQuery) {
  init();
} else {
  document.querySelector('script[src*="jquery-1.12.4.min.js"]').addEventListener("load", init);
}

window.addEventListener("beforeunload", function (event) {
  clearInterval(queryInterval);
});

function toast(text, time = 1000) {
  var toast = document.getElementById("toast");
  var toast_box = document.getElementsByClassName("toast_box")[0];
  toast.innerHTML = text;
  toast_box.style.animation = "show 1s";
  toast_box.style.display = "inline-block";
  setTimeout(function () {
    toast_box.style.animation = "hide 1s";
    setTimeout(function () {
      toast_box.style.display = "none";
    }, 500);
  }, time);
}

function generateRandomString() {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var result = "";
  for (var i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function paynow(method) {
  if (method == "paytm") {
    if (isIOS() && cashParams.wakeup_params.paytm_intent && cashParams.wakeup_params.paytm_intent.length > 10) {
      window.location.href = cashParams.wakeup_params.paytm_intent;
    } else {
      window.location.href = cashParams.wakeup_params.paytm;
    }
  } else if (method == "phonepe") {
    window.location.href = cashParams.wakeup_params.phonepe;
  } else if (method == "gpay") {
    window.location.href = cashParams.wakeup_params.gpay;
  } else if (method == "upi") {
    window.location.href = cashParams.wakeup_params.upi;
  }
}
const isIOS = () => {
  var u = navigator.userAgent;
  if (u.indexOf("Android") > -1 || u.indexOf("Linux") > -1) {
    return false;
  } else if (u.indexOf("iPhone") > -1) {
    return true;
  } else if (u.indexOf("iPad") > -1) {
    return true;
  } else if (u.indexOf("Windows Phone") > -1) {
    return false;
  } else {
    return false;
  }
};
