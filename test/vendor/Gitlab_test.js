'use strict';
var chai = require('chai');
var jsdom = require('jsdom');
var sinon = require('sinon');
require('../../src/vendor/Base');
var GitlabVendor = require('../../src/vendor/Gitlab');
var expect = chai.expect;
var should = chai.should();
var helper = require('./helper');

var Gitlab;
var $;

describe('Gitlab Vendor function.', function () {
  var runRegExpOnPathnameStub;

  beforeEach(function (beforeDone) {
    helper.initDom((err, window) => {
      if (err) {
        return beforeDone(err);
      }
      Gitlab = new GitlabVendor('gitlab.com');
      $ = window.jQuery;
      beforeDone();
    });
  });

  it('Should throw if domain is not provided', function () {
    expect(() => new GitlabVendor()).to.throw(/domain is required/);
  });

  it('Should verify Gitlab object.', function () {
    Gitlab.should.be.an('object');
    expect(Gitlab.owner).to.be.undefined;
    expect(Gitlab.repo).to.be.undefined;
    expect(Gitlab.issueId).to.be.undefined;
  });

  describe('isEnabled()', function () {
    beforeEach(function () {
      runRegExpOnPathnameStub = sinon.stub(Gitlab, 'runRegExpOnPathname');
    });

    afterEach(function () {
      runRegExpOnPathnameStub.restore();
    });

    it('Should return false if url does not match issues.', function () {
      var enabled;
      runRegExpOnPathnameStub.returns(null);
      enabled = Gitlab.isEnabled();
      enabled.should.equal(false);
    });

    describe('Issues page.', function () {
      var owner = 'tcDeveloper',
        repo = 'aTestRepo',
        issueId = '5';

      beforeEach(function () {
        runRegExpOnPathnameStub.returns(['fake', owner, repo, issueId]);
      });

      it('Should set the values and exit if no show_issue element is found', function () {
        var enabled;
        enabled = Gitlab.isEnabled();
        enabled.should.equal(false);
        Gitlab.repo.should.equal(repo);
        Gitlab.owner.should.equal(owner);
        Gitlab.issueId.should.equal(issueId);
      });

      describe('show_issue exists', function () {

        it('Should return false if no wrapper element exists', function () {
          var enabled;
          enabled = Gitlab.isEnabled();
          enabled.should.equal(false);
          Gitlab.repo.should.equal(repo);
          Gitlab.owner.should.equal(owner);
          Gitlab.issueId.should.equal(issueId);
        });
      });

      describe('wrapper exists', function () {
        beforeEach(function () {
          $('body').append('<div class="issue-btn-group"></div>');
        });

        afterEach(function () {
          $('.issue-btn-group').remove();
        });

        it('Should be enabled if all conditions pass.', function () {
          var enabled = Gitlab.isEnabled();
          enabled.should.equal(true);
          Gitlab.repo.should.equal(repo);
          Gitlab.owner.should.equal(owner);
          Gitlab.issueId.should.equal(issueId);
        });
      });
    });

  });

  describe('addButton()', function () {

    beforeEach(function () {
      $('body').append('<div class="issue-btn-group"></div>');
    });

    afterEach(function () {
      $('.issue-btn-group').remove();
    });

    it('Should be enabled if all conditions pass.', function () {
      Gitlab.addButton(helper.createTCButton());
      should.exist($('.btn-topcoder'));
    });
  });
});
