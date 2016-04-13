/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the script for options page
 *
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */

var TOKEN_KEY_GITHUB = 'glib::github_token';
var TOKEN_KEY_GITLAB = 'glib::gitlab_token';
var TOKEN_KEY_TOPCODER = 'glib::topcoder_token';
var ADD_MASS_DELIMETER = '###';
var ENVIRONMENT = 'glib::environment';

/**
 * Set the value in Chrome Storage
 */
function setChromeStorage(key, val) {
  var obj = {};
  obj[key] = val;
  chrome.storage.local.set(obj);
}

/**
 * Remove a key from Chrome Storage
 */
function removeChromeStorage(key) {
  chrome.storage.local.remove(key);
}

$(document).ready(function () {
    /* initialization for vex library */
  vex.defaultOptions.className = 'vex-theme-os';
    /* Onload populate mappings from Chrome Storage */
  populateRepoMaps();

    /* Populate OAuth tokens */
  chrome.storage.local.get(TOKEN_KEY_GITHUB, function (result) {
    if (result[TOKEN_KEY_GITHUB] == undefined) {
      $(".delete[type='github']").prop('disabled', true);
    } else {
      $('#githubToken').val(result[TOKEN_KEY_GITHUB]);
    }
  });
  chrome.storage.local.get(TOKEN_KEY_GITLAB, function (result) {
    if (result[TOKEN_KEY_GITLAB] == undefined) {
      $(".delete[type='gitlab']").prop('disabled', true);
    } else {
      $('#gitlabToken').val(result[TOKEN_KEY_GITLAB]);
    }
  });
  chrome.storage.local.get(TOKEN_KEY_TOPCODER, function (result) {
    if (result[TOKEN_KEY_TOPCODER] == undefined) {
      $(".delete[type='topcoder']").prop('disabled', true);
    } else {
      $('#topCoderToken').val(result[TOKEN_KEY_TOPCODER]);
    }
  });

    // CWD-- set checkbox status
  chrome.storage.local.get(ENVIRONMENT, function (result) {
    if (result[ENVIRONMENT] == undefined) {
      $('#environment').prop('checked', false);
    } else {
      $('#environment').prop('checked', result[ENVIRONMENT]);
    }
  });

    // CWD-- bind event on checkbox
  $('#environment').click(function () {
    setChromeStorage(ENVIRONMENT, $('#environment').prop('checked'));
  });

    /* Delete GitHub and TopCoder tokens */
  $('.delete').click(function () {
    var self = this;
    vex.dialog.confirm({
      message: 'Are you sure to delete the token ?',
      callback: function (value) {
        if (value) {
          if ($(self).attr('type') == 'github') {
            $(".delete[type='github']").prop('disabled', true);
            removeChromeStorage(TOKEN_KEY_GITHUB);
            $('#githubToken').val('');
          } else if ($(self).attr('type') == 'gitlab') {
            $(".delete[type='gitlab']").prop('disabled', true);
            removeChromeStorage(TOKEN_KEY_GITLAB);
            $('#gitlabToken').val('');
          } else {
            $(".delete[type='topcoder']").prop('disabled', true);
            removeChromeStorage(TOKEN_KEY_TOPCODER);
            $('#topCoderToken').val('');
          }
        }
      }
    });
  });

    /* Delete mappings on click of delete icons */
  $(document).on('click', '.remove', function (e) {
    var index = $(this).attr('index');
    var self = this;
    chrome.storage.local.get('repoMap', function (result) {
            /* Remove a specfic index from the existing data array */
      result.repoMap.splice(index, 1);
      setChromeStorage('repoMap', result.repoMap);
      $(self).parent().fadeOut(300, function () {
        $(self).parent().remove();
      });
            /* Change each row's index after delete */
      $('#mapWrapper div').each(function (index) {
        $(this).find('.project-id,.repo-url,.remove').attr('index', index);
      });
      if ($('#mapWrapper div').length == 1) {
        $('.delete-all').prop('disabled', true);
      }
    });

  });

    /* Add a new mapping. Store the data in Chrome Storage. */
  $('#add').click(function () {
    chrome.storage.local.get('repoMap', function (result) {
      var mapObj = {
        'projectId': $('#pid').val(),
        'repoURL': $('#repoUrl').val()
      };

      if (result.repoMap == undefined || result.repoMap.length == 0) {
        setChromeStorage('repoMap', [mapObj]);
      } else {
                /* Push to existing data */
        result.repoMap.push(mapObj);
        setChromeStorage('repoMap', result.repoMap);
      }
      populateRepoMaps();
    });
  });

    /* Delete all mappings. */
  $('.delete-all').click(function () {
    var self = this;
    vex.dialog.confirm({
      message: 'Are you sure to delete all mappings ?',
      callback: function (value) {
        if (value) {
          removeChromeStorage('repoMap');
          populateRepoMaps();
        }
      }
    });
  });

    /**
     * Mass addition of mappings. The default separator is ###.
     * One mapping on each line
     */
  $('#addMass').click(function () {
    var self = this;
    vex.dialog.open({
      message: 'Enter TopCoder project id and GitHub repo separated by ' +
                ADD_MASS_DELIMETER + ' (one mapping on each line)',
      input: '<textarea rows="7" placeholder="PROJECT_ID ' + ADD_MASS_DELIMETER +
                ' REPO_URL\nPROJECT_ID ' + ADD_MASS_DELIMETER +
                ' REPO_URL" name="mappings"></textarea>',
      buttons: [
        $.extend({}, vex.dialog.buttons.YES, {
          text: 'Add mass'
        }), $.extend({}, vex.dialog.buttons.NO, {
          text: 'Cancel'
        })
      ],
      callback: function (data) {
        if (data === false) {
          console.log('canceled');
        } else {
          var mapArr = [];
                    /* Split each new line */
          var lines = data.mappings.split('\n');
          for (var i = 0; i < lines.length; i++) {
            var projectId = lines[i].split(ADD_MASS_DELIMETER)[0];
            var gitRepo = lines[i].split(ADD_MASS_DELIMETER)[1];
            mapArr.push({
              'projectId': projectId,
              'repoURL': gitRepo
            });
          }
                    /* Read from Chrome Storage and push to existing array */
          chrome.storage.local.get('repoMap', function (result) {
            var mapsInStorage = result.repoMap;
            if (mapsInStorage == undefined || mapsInStorage.length == 0) {
              mapsInStorage = [];
            }
                        /* Push to existing data */
            for (var i = 0; i < mapArr.length; i++) {
              mapsInStorage.push(mapArr[i]);
            }
            setChromeStorage('repoMap', mapsInStorage);
            populateRepoMaps();
          });
        }
      }
    });
  });

    /* Mapping fields are editable. Save the data while user edits the fields */
  $(document).on('keyup', '.project-id,.repo-url', function () {
    var index = $(this).attr('index');
    chrome.storage.local.get('repoMap', function (result) {
      result.repoMap[index] = {
        'projectId': $(".project-id[index='" + index + "']").val(),
        'repoURL': $(".repo-url[index='" + index + "']").val()
      };
      setChromeStorage('repoMap', result.repoMap);
    });
  });
});


/**
 * Read values from Chrome Storage and populate the mapping list
 */
function populateRepoMaps() {
  $('#mapWrapper').empty();
  chrome.storage.local.get('repoMap', function (result) {
    if (result.repoMap != undefined) {
      if (result.repoMap == '' || result.repoMap.length == 0) {
        $('.delete-all').prop('disabled', true);
      } else {
        $('.delete-all').prop('disabled', false);
      }

      for (var i = 0; i < result.repoMap.length; i++) {
        var html = "<input type='text' class='project-id' index=" + i + '>' +
                    "<input type='text' class='repo-url' index=" + i + '>' +
                    "<img class='remove' src='images/delete.png' index=" + i + '>';
        var div = $('<div>')
                    .appendTo('#mapWrapper')
                    .append(html);
        $(div).find('.project-id').val(result.repoMap[i].projectId);
        $(div).find('.repo-url').val(result.repoMap[i].repoURL);
      }
    } else {
      $('.delete-all').prop('disabled', true);
    }
  });
}
