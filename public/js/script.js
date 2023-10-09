$(document).ready(function () {
  $("#signup-tab").on("click", function (e) {
    e.preventDefault();
    $("#signin").removeClass("show active");
    $("#signup").addClass("show active");
    $("#signin-tab").removeClass("active");
    $(this).addClass("active");
  });

  $("#signin-tab").on("click", function (e) {
    e.preventDefault();
    $("#signup").removeClass("show active");
    $("#signin").addClass("show active");
    $("#signup-tab").removeClass("active");
    $(this).addClass("active");
  });
});
