'use strict';
var chai = require('chai');
var sinon = require('sinon');
require('../../src/vendor/Base');
var JiraVendor = require('../../src/vendor/Jira');
var expect = chai.expect;
var should = chai.should();
var helper = require('./helper');

var Jira;
var $;

describe('Jira Vendor function.', function () {

  var runRegExpOnPathnameStub;
  beforeEach(function (beforeDone) {
    helper.initDom((err, window) => {
      if (err) {
        return beforeDone(err);
      }
      Jira = new JiraVendor();
      $ = window.jQuery;
      beforeDone();
    });
  });

  it('Should verify Jira object.', function () {
    Jira.should.be.an('object');
    expect(Jira.owner).to.be.undefined;
    expect(Jira.repo).to.be.undefined;
    expect(Jira.issueId).to.be.undefined;
  });

  describe('isEnabled()', function () {
    beforeEach(function () {
      runRegExpOnPathnameStub = sinon.stub(Jira, 'runRegExpOnPathname');
    });

    afterEach(function () {
      runRegExpOnPathnameStub.restore();
    });

    it('Should return false if url does not match issues.', function () {
      var enabled;
      runRegExpOnPathnameStub.returns(null);
      enabled = Jira.isEnabled();
      enabled.should.equal(false);
    });

    describe('Issues page.', function () {
      var issueId = 'TEST-5';

      beforeEach(function () {
        runRegExpOnPathnameStub.returns(['fake', issueId]);
      });

      it('Should set the values and exit if no show_issue element is found', function () {
        var enabled;
        enabled = Jira.isEnabled();
        enabled.should.equal(false);
        Jira.issueId.should.equal(issueId);
      });

      describe('show_issue exists', function () {

        it('Should return false if no wrapper element exists', function () {
          var enabled;
          enabled = Jira.isEnabled();
          enabled.should.equal(false);
          Jira.issueId.should.equal(issueId);
        });
      });

      describe('wrapper exists', function () {
        beforeEach(function () {
          $('body').append('<div id="opsbar-comment-issue_container"></div>');
        });

        afterEach(function () {
          $('#opsbar-comment-issue_container').remove();
        });

        it('Should be enabled if all conditions pass.', function () {
          var enabled = Jira.isEnabled();
          enabled.should.equal(true);
          Jira.issueId.should.equal(issueId);
        });
      });
    });

  });

  describe('addButton()', function () {

    beforeEach(function () {
      $('body').append('<div id="opsbar-comment-issue_container"></div>');
    });

    afterEach(function () {
      $('#opsbar-comment-issue_container').remove();
    });

    it('Should be enabled if all conditions pass.', function () {
      Jira.addButton(helper.createTCButton());
      should.exist($('.btn-topcoder'));
    });
  });
});
