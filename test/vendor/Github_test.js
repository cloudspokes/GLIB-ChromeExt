'use strict';
var chai = require('chai');
var jsdom = require('jsdom');
var sinon = require('sinon');
require('../../src/vendor/Base');
var GithubVendor = require('../../src/vendor/Github');
var expect = chai.expect;
var should = chai.should();
var helper = require('./helper');

var Github;
var $;

describe('Github Vendor function.', function () {

  var runRegExpOnPathnameStub;

  beforeEach(function (beforeDone) {
    helper.initDom((err, window) => {
      if (err) {
        return beforeDone(err);
      }
      Github = new GithubVendor('github.com');
      $ = window.jQuery;
      beforeDone();
    });
  });

  it('Should throw if domain is not provided', function () {
    expect(() => new GithubVendor()).to.throw(/domain is required/);
  });

  it('Should verify Github object.', function () {
    Github.should.be.an('object');
    expect(Github.owner).to.be.undefined;
    expect(Github.repo).to.be.undefined;
    expect(Github.issueId).to.be.undefined;
  });

  describe('isEnabled()', function () {
    beforeEach(function () {
      runRegExpOnPathnameStub = sinon.stub(Github, 'runRegExpOnPathname');
    });

    afterEach(function () {
      runRegExpOnPathnameStub.restore();
    });

    it('Should return false if url does not match issues.', function () {
      var enabled;
      runRegExpOnPathnameStub.returns(null);
      enabled = Github.isEnabled();
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
        enabled = Github.isEnabled();
        enabled.should.equal(false);
        Github.repo.should.equal(repo);
        Github.owner.should.equal(owner);
        Github.issueId.should.equal(issueId);
      });

      describe('show_issue exists', function () {
        beforeEach(function () {
          $('body').append('<div id="show_issue"></div>');
        });

        afterEach(function () {
          $('show_issue').remove();
        });

        it('Should return false if no wrapper element exists', function () {
          var enabled;

          enabled = Github.isEnabled();
          enabled.should.equal(false);
          Github.repo.should.equal(repo);
          Github.owner.should.equal(owner);
          Github.issueId.should.equal(issueId);
        });
      });

      describe('wrapper exists', function () {
        beforeEach(function () {
          $('body').append('<div id="show_issue"><div id="test" class="gh-header-actions"><div id="immaWrapper"></div></div></div>');
        });

        afterEach(function () {
          $('#show_issue').remove();
        });

        it('Should be enabled if all conditions pass.', function () {
          var enabled = Github.isEnabled();
          enabled.should.equal(true);
          Github.repo.should.equal(repo);
          Github.owner.should.equal(owner);
          Github.issueId.should.equal(issueId);
        });
      });
    });
  });

  describe('addButton()', function () {

    beforeEach(function () {
      $('body').append('<div id="show_issue"><div class="gh-header-actions"><div id="immaWrapper"></div></div></div>');
    });

    afterEach(function () {
      $('#show_issue').remove();
    });

    it('Should be enabled if all conditions pass.', function () {
      Github.addButton(helper.createTCButton());
      should.exist($('.btn-topcoder'));
    });
  });
});
