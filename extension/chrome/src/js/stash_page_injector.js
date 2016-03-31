(function() {
	if(typeof define === 'undefined')
		return;
	
	define('stash-plugin/branch-details-page', [
	    'aui',
	    'aui/flag',
	    'jquery',
	    'lodash',
	    'util/events',
	    'stash/api/util/state'
	], function (
	    AJS,
	    auiFlag,
	    jQuery,
	    _,
	    events,
	    pageState
	) {
		'use strict';
		//////////////////////////////////////////////////// Display PRs status on branch page
	  	function loadPRStickers(branchRefId) {
		    var project = pageState.getProject();
		    var repository = pageState.getRepository();
		    var ref = pageState.getRef();
		    var branchId = branchRefId || ref.id;
		    if(!project || !project.link) {
		    	return;
		    }
		    var projectUrl = project.link.url;
		    var repoUrl = "repos/" + repository.slug;

		    if(!ref || !ref.repository || !ref.repository.origin) {
		    	return;
		    }

		    // get project origin from ref and get PR with branch name
		    var projectOriginUrl = ref.repository.origin.link.url.replace('/browse', '');
		    projectOriginUrl = projectUrl + '/' + repoUrl;

		    var getPRs = function(from, size, projectOriginUrl, fqBranchName) {
		      var prApiUrl = '/rest/api/1.0' + projectOriginUrl + '/pull-requests?direction=OUTGOING&at=' + fqBranchName + '&state=ALL&start=' + from + '&limit=' + size;
		      return jQuery.get(prApiUrl);
		    };

		    var searchPrs = function(from, size, projectOriginUrl, fqBranchName) {
		      var deferred = jQuery.Deferred();
		      var prList = [];
		      getPRs(from, size, projectOriginUrl, fqBranchName).done(function(pullRequests){
		        prList = pullRequests.values;

		          if(!pullRequests.isLastPage) {
		            searchPrs(from + size, size, projectOriginUrl, fqBranchName).done(function(list){
		              if (list.length > 0) {
		                jQuery.merge(prList, list);
		              }

		              deferred.resolve(prList);	    		
		            });
		          }
		          else {
		            deferred.resolve(prList);	
		          }
		        
		      });

		      return 	deferred.promise();
		    };

		    searchPrs(0, 20, projectOriginUrl, branchId).done(function(prs) {
		      var mergedClass = 'aui-lozenge-success';
		      var openClass = 'aui-lozenge-complete';
		      var declinedClass = 'aui-lozenge-error';

		      var $wrapper = jQuery('<div id="pr-status-wrapper" style="display: inline-block"></div>');
		      jQuery('#pr-status-wrapper').remove();
			  jQuery('.aui-toolbar2-secondary').prepend($wrapper);
			  
		      prs.forEach(function(pr){
		        var commentsCount = pr.attributes.commentCount ? pr.attributes.commentCount[0] : 0;
		        var resolvedTaskCount = pr.attributes.resolvedTaskCount ? pr.attributes.resolvedTaskCount[0] : 0;
		        var openTaskCount = pr.attributes.openTaskCount ? parseInt(pr.attributes.openTaskCount[0]) + parseInt(resolvedTaskCount) : 0;
		        var dest = pr.toRef ? pr.toRef.displayId : '';

		        var title = 'branch: ' + dest + ' | comments: ' + commentsCount + ' | tasks: ' + resolvedTaskCount + ' / ' + openTaskCount + ' | PR: ' + pr.title;
		        var $a = jQuery('<a>',{
		            text: pr.state,
		            title: title,
		            href: pr.link.url,
		            class: 'aui-lozenge declined aui-lozenge-subtle pull-request-list-trigger pull-request-state-lozenge'
		        });
		        if(pr.state === 'OPEN'){
		          $a.addClass(openClass);
		        }
		        else if(pr.state === 'MERGED'){
		          $a.addClass(mergedClass);
		        }
		        else if(pr.state === 'DECLINED'){
		          $a.addClass(declinedClass);
		        }

		        $a.css('margin-left', '6px');
		        
		        $wrapper.append($a);

		        jQuery("#pr-status-wrapper").find('a').tooltip();
		      });
		    });
		}

		function addForkOriginLink(branchRefId) {
		    var repository = pageState.getRepository();
		    if(repository && repository.origin && repository.origin.link && repository.origin.link.url) {
			    var $link = jQuery('<a style="font-size: small;margin-left:10px;">forked from '+repository.origin.project.key+ '/' +repository.origin.name+'</a>').attr('href', repository.origin.link.url);
			    jQuery('h2.page-panel-content-header').append($link);
			}
		}

		return {
			loadPRStickers: loadPRStickers,
			addForkOriginLink: addForkOriginLink
		}
	});

	define('stash-plugin/pullrequest-create-page', [
	    'aui',
	    'aui/flag',
	    'jquery',
	    'lodash',
	    'util/events',
	    'stash/api/util/state'
	], function (
	    AJS,
	    auiFlag,
	    jQuery,
	    _,
	    events,
	    pageState
	) {
		'use strict';
		var listId = "ul_reviewers_list";
		var reviewersDataKey = "reviewers";
		var buttonIconId = "img_group_icon";

		function getGroupIcon(){
			return '<img id="'+buttonIconId+'" style="width:16px; height:16px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAABiElEQVRIS72V/zEEQRCFv4sAESADIkAEZIAMXASIABEgAyJABC4DRIAIqE/NXu3Oza/aOtf/bO1uT7/u1697JqzAJivAoAZyBBwCWyGZGXAJfIX3HWAN+ADecwmXQO6A48RBg/nvBhB0M/g8hAT8NrAcyAlwW6Gyq+gq8tsN4PPPOZBnYK8CYkUG/Iz8HgFproLIuVzXzCR/IqcXYL8FJD5Y6ulokBa6VJQZv0UZKIizlkpUitItmdxfA0//2RP7tp1o/D2gOquNb6HLBkvLay/ed6BwMCs5CTvJ/cMp2pSvIP2BXajCg6WJL/XFflwkEtnorZwqXTqUqjkIvMdrJ5l0bUHm5iU1hCbmTpvG1YwFkRbpzK0eweyPAsr2xNXughysh173PXwa3m2+kk2tIedoGleiszzngscqE8ysFYLP1ADPQWyymfscY86Flbl9z6MAMyuRGmdifUz03hk3gLOjtLub9O+3ILkbcAzmwl3SgbTeHS2gxlJ5A7MSy1umLcSrzclSwH8BMXpPGYwvvtgAAAAASUVORK5CYII="/>';
		}

		function getGroupIconLoader(){
			return '<img id="'+buttonIconId+'" src="data:image/gif;base64,R0lGODlhEAAQAPYAAP///wAAANTU1JSUlGBgYEBAQERERG5ubqKiotzc3KSkpCQkJCgoKDAwMDY2Nj4+Pmpqarq6uhwcHHJycuzs7O7u7sLCwoqKilBQUF5eXr6+vtDQ0Do6OhYWFoyMjKqqqlxcXHx8fOLi4oaGhg4ODmhoaJycnGZmZra2tkZGRgoKCrCwsJaWlhgYGAYGBujo6PT09Hh4eISEhPb29oKCgqioqPr6+vz8/MDAwMrKyvj4+NbW1q6urvDw8NLS0uTk5N7e3s7OzsbGxry8vODg4NjY2PLy8tra2np6erS0tLKyskxMTFJSUlpaWmJiYkJCQjw8PMTExHZ2djIyMurq6ioqKo6OjlhYWCwsLB4eHqCgoE5OThISEoiIiGRkZDQ0NMjIyMzMzObm5ri4uH5+fpKSkp6enlZWVpCQkEpKSkhISCIiIqamphAQEAwMDKysrAQEBJqamiYmJhQUFDg4OHR0dC4uLggICHBwcCAgIFRUVGxsbICAgAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAAHjYAAgoOEhYUbIykthoUIHCQqLoI2OjeFCgsdJSsvgjcwPTaDAgYSHoY2FBSWAAMLE4wAPT89ggQMEbEzQD+CBQ0UsQA7RYIGDhWxN0E+ggcPFrEUQjuCCAYXsT5DRIIJEBgfhjsrFkaDERkgJhswMwk4CDzdhBohJwcxNB4sPAmMIlCwkOGhRo5gwhIGAgAh+QQJCgAAACwAAAAAEAAQAAAHjIAAgoOEhYU7A1dYDFtdG4YAPBhVC1ktXCRfJoVKT1NIERRUSl4qXIRHBFCbhTKFCgYjkII3g0hLUbMAOjaCBEw9ukZGgidNxLMUFYIXTkGzOmLLAEkQCLNUQMEAPxdSGoYvAkS9gjkyNEkJOjovRWAb04NBJlYsWh9KQ2FUkFQ5SWqsEJIAhq6DAAIBACH5BAkKAAAALAAAAAAQABAAAAeJgACCg4SFhQkKE2kGXiwChgBDB0sGDw4NDGpshTheZ2hRFRVDUmsMCIMiZE48hmgtUBuCYxBmkAAQbV2CLBM+t0puaoIySDC3VC4tgh40M7eFNRdH0IRgZUO3NjqDFB9mv4U6Pc+DRzUfQVQ3NzAULxU2hUBDKENCQTtAL9yGRgkbcvggEq9atUAAIfkECQoAAAAsAAAAABAAEAAAB4+AAIKDhIWFPygeEE4hbEeGADkXBycZZ1tqTkqFQSNIbBtGPUJdD088g1QmMjiGZl9MO4I5ViiQAEgMA4JKLAm3EWtXgmxmOrcUElWCb2zHkFQdcoIWPGK3Sm1LgkcoPrdOKiOCRmA4IpBwDUGDL2A5IjCCN/QAcYUURQIJIlQ9MzZu6aAgRgwFGAFvKRwUCAAh+QQJCgAAACwAAAAAEAAQAAAHjIAAgoOEhYUUYW9lHiYRP4YACStxZRc0SBMyFoVEPAoWQDMzAgolEBqDRjg8O4ZKIBNAgkBjG5AAZVtsgj44VLdCanWCYUI3txUPS7xBx5AVDgazAjC3Q3ZeghUJv5B1cgOCNmI/1YUeWSkCgzNUFDODKydzCwqFNkYwOoIubnQIt244MzDC1q2DggIBACH5BAkKAAAALAAAAAAQABAAAAeJgACCg4SFhTBAOSgrEUEUhgBUQThjSh8IcQo+hRUbYEdUNjoiGlZWQYM2QD4vhkI0ZWKCPQmtkG9SEYJURDOQAD4HaLuyv0ZeB4IVj8ZNJ4IwRje/QkxkgjYz05BdamyDN9uFJg9OR4YEK1RUYzFTT0qGdnduXC1Zchg8kEEjaQsMzpTZ8avgoEAAIfkECQoAAAAsAAAAABAAEAAAB4iAAIKDhIWFNz0/Oz47IjCGADpURAkCQUI4USKFNhUvFTMANxU7KElAhDA9OoZHH0oVgjczrJBRZkGyNpCCRCw8vIUzHmXBhDM0HoIGLsCQAjEmgjIqXrxaBxGCGw5cF4Y8TnybglprLXhjFBUWVnpeOIUIT3lydg4PantDz2UZDwYOIEhgzFggACH5BAkKAAAALAAAAAAQABAAAAeLgACCg4SFhjc6RhUVRjaGgzYzRhRiREQ9hSaGOhRFOxSDQQ0uj1RBPjOCIypOjwAJFkSCSyQrrhRDOYILXFSuNkpjggwtvo86H7YAZ1korkRaEYJlC3WuESxBggJLWHGGFhcIxgBvUHQyUT1GQWwhFxuFKyBPakxNXgceYY9HCDEZTlxA8cOVwUGBAAA7AAAAAAAAAAAA"/>';
		}

		/**
		 * Use stash api to search for the user
		 * @param {integer} term name or email of the user to search.
		 */
		function searchUsersAsync(term) {
			var deferred = jQuery.Deferred();

			var searchParams = { avatarSize: 32, permission: "LICENSED_USER", start: 0, filter: term };

			jQuery.get( "/rest/api/latest/users", searchParams)
			.done(function( data ) {
				if (data.values.length > 0)
				{
				    var rawd = data.values[0];
				    var select2Data = {
				            id: rawd.name,
				            text: rawd.displayName || rawd.name,
				            item: rawd };

				    deferred.resolve(select2Data);
			  	}

			  	deferred.resolve(null);	    
		  	})
			.fail(function(){
				// use resolve instead of reject to avoid prematured end with $.when
				deferred.resolve(null);
			});

			return deferred.promise();
		}

		function attachDropdownClickEvent(dropdown) {
			jQuery(dropdown).find('#' + listId).find('li').click(function() {
				var $element = jQuery(this);
				var reviewers = $element.data(reviewersDataKey);
				var differedList = [];
				var select2DataArray = [];

				// show loader 
				jQuery('#'+buttonIconId).replaceWith(getGroupIconLoader());

				reviewers.forEach(function(reviewer){
					// request user data from search api
					var searchDeferred = searchUsersAsync(reviewer);
					// waiting list
					differedList.push(searchDeferred);
					// add to the array
					searchDeferred.done(function(select2Data){
						if(select2Data) {
							select2DataArray.push(select2Data);
						}
					});
				});

				jQuery.when.apply(jQuery, differedList).done(function() {
					// redisplay icon and remove loader
					jQuery('#'+buttonIconId).replaceWith(getGroupIcon());
					
					var replacePrevious = jQuery('#replaceGroups').is(':checked') || false;
					//////////// update the user selector
					// need this to reproduce the event triggered by select2 on a single selection. (change Event contain "added" or "removed" property set with an object and not an array)
					// Without that the widget/searchable-multi-selector wrapper made by atlassian won't change his data internally corrrectly
					
					// clean (for atlassian wrapper)
					var allUsers = AJS.$('#reviewers').auiSelect2("data");								
					AJS.$('#reviewers').auiSelect2("data", null).trigger("change");
					AJS.$('#reviewers').auiSelect2("val", null).trigger("change");
					allUsers.forEach(function(item){
						var e = new jQuery.Event("change");
						e.removed = item;
						AJS.$('#reviewers').trigger(e);
					});				

					if (!replacePrevious) {
						jQuery.merge(select2DataArray, allUsers);
					}

					// add (for atlassian wrapper)
					select2DataArray.forEach(function(select2Data){
						var e = new jQuery.Event("change");
						e.added = select2Data;
						AJS.$('#reviewers').trigger(e);				
					});

					// update displayed value (for select2)
					AJS.$('#reviewers').auiSelect2("data", select2DataArray);			
				});
			});
		}
		
		function injectReviewersDropdown(jsonGroups) {
			var $reviewersInput = jQuery('#s2id_reviewers');
			if ($reviewersInput.length == 0) {
				return;
			}

			// empty dropdown for reviewers group
			var checkedProperty = '';
			if((localStorage.getItem('replaceGroupsState') || false).toString().toBool()) {
				checkedProperty = ' checked="checked"';
			}

			var dropdownHTML = ([
			'<a href="#reviewers_list" aria-owns="reviewers_list" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger" style="margin-left: 10px; display: inline-block; top: -10px;">',
				getGroupIcon(),
			'</a>',
			'<div id="reviewers_list" class="aui-style-default aui-dropdown2">',
			    '<ul class="aui-list-truncate" id="'+ listId +'">',
			    '</ul>', 
			'</div>',
			'<div class="checkbox" id="replaceGroupsDiv">',
				'<input class="checkbox" type="checkbox" name="replaceGroups" id="replaceGroups"'+checkedProperty+'>',
				'<label for="replaceGroups">Replace</label>',
			'</div>'
			]).join("\n");

			// jquery instance
			var $dropdown = jQuery(dropdownHTML);

			// add groups list
			jsonGroups.groups.forEach(function(group) {
				var linkText = group.groupName + ' (' + group.reviewers.length + ' reviewers)';
				var $a = jQuery('<a href="Javascript:void(0)"></a>').text(linkText);
				var $li = jQuery('<li></li>').append($a).data(reviewersDataKey, group.reviewers);
				$dropdown.find('#' + listId).append($li);
			});

			
			// click event
			attachDropdownClickEvent($dropdown);

			// save checkbox state on change
			$dropdown.find('#replaceGroups').on('change', function(data) {
				var state = jQuery(this).is(':checked') || false;
				localStorage.setItem('replaceGroupsState', state);
			});

			// fix z-index bug
			$dropdown.on({
			    "aui-dropdown2-show": function() {
			    	window.setTimeout(function(){
			    		jQuery("#reviewers_list").css("z-index", "4000");
			    	}, 50);		        
			    }
			});

			// append to the page		
			$reviewersInput.after($dropdown);
		}

		return {
			injectReviewersDropdown: injectReviewersDropdown
		}
	});

	define('stash-plugin/pullrequest-details-page', [
	    'aui',
	    'aui/flag',
	    'jquery',
	    'lodash',
	    'util/events',
	    'stash/api/util/state'
	], function (
	    AJS,
	    auiFlag,
	    jQuery,
	    _,
	    events,
	    pageState
	) {
		'use strict';
		//////////////////////////////////////////////////// Build with jenkins link
		function addBuildLink() {		
			var pr = pageState.getPullRequest();
			var user = pageState.getCurrentUser();

			if (!pr) {
				return;
			}
			
			if(pr.author.user.id === user.id) {
			  //if(!jQuery('.build-status-summary').length) { }
			    var $startWrapper = jQuery('<div class="plugin-item build-status-summary"></div>');
			    var $startLink = jQuery('<a href="#"><span class="aui-icon aui-icon-small aui-iconfont-deploy" title="Builds">Build status</span><span class="label">Start new build</span></a>');
			    $startLink.click(function(){
		    		var url = 'http://<add_your_jenkins_url_here>/job/personal-pullrequest-test/';
		    		$startLink.find('span.label').text('Starting...');

			    	var userName = (window.hipchatUsername || '').replace('@', '');
			    	if (typeof chromeExtId !== 'undefined') {
					    chrome.runtime.sendMessage(chromeExtId, {
						    method: 'POST',
						    action: 'xhttp',
						    url: url + 'buildWithParameters',
						    data: 'PULLREQUEST_ID=' + pr.id + '&HIPCHAT_USER=' + userName
						}, function(data) {
							auiFlag({
		                        type: 'info',
		                        title: 'Jenkins Build Started!',
		                        body: '<br><a href="' + url + '" target="_blank">Go to Jenkins</a>', // shourld be data.redirect
		                        close: 'auto'
		                    });
					        $startLink.unbind('click');
					        $startLink.attr('href', url).attr('target', '_blank'); // shourld be data.redirect
					        $startLink.find('span.label').text('See started job on jenkins!');
						});
					}
					else {
						window.ajaxRequest({
						    method: 'POST',
						    url: url,
						    data: { 
						      'PULLREQUEST_ID': pr.id,
						      'HIPCHAT_USER': userName
							}
						}, 
						function(location) {
							auiFlag({
								type: 'info',
								title: 'Jenkins Build Started!',
								body: '<br><a href="' + location + '">Go to Jenkins</a>',
								close: 'auto'
							});
							$startLink.unbind('click');
					        $startLink.attr('href', location);
					        $startLink.find('span.label').text('See started job on jenkins!');
						});
					}
			      
			    	return false;
			    });
			    
			    $startWrapper.append($startLink);
			    jQuery('.plugin-section-primary').prepend($startWrapper);
			}
		}

		//////////////////////////////////////////////////// Clickable branch on PR page
	  	function attachNavigateToBranchLink() {
			var pr = pageState.getPullRequest();

	  		var $branchOriginSpan = jQuery('.source-branch');  		
	  		if ($branchOriginSpan.length) {	  		
				var urlFrom = pr.fromRef.repository.link.url;
				urlFrom += '?at=' + pr.fromRef.id;
				$branchOriginSpan.css('cursor', 'pointer').click(function(){ window.location.href = urlFrom; }).data('url', urlFrom);
			}

			var $branchDestinationSpan = jQuery('.target-branch');
	  		if ($branchDestinationSpan.length) {
				var urlTo = pr.toRef.repository.link.url;
				urlTo += '?at=' + pr.toRef.id;
				$branchDestinationSpan.css('cursor', 'pointer').click(function(){ window.location.href = urlTo; }).data('url', urlTo);
			}
	  	}

	  	//////////////////////////////////////////////////// dropdoan list with git checkout commands
	  	function addCheckoutLink() {
			var pr = pageState.getPullRequest();

			if (!pr.fromRef.repository.project.owner) {
				return;
			}
			
			var cloneUrl;
			var repoName = pr.fromRef.repository.name;			
			var branchOrigin = pr.fromRef.displayId;
			var remoteName = pr.fromRef.repository.project.owner.slug;

			if(!pr.fromRef.repository.links.clone) {
				var $link =  jQuery(['<a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger">',
								' -- Checkout -- ',
								'</a>',								
								'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
								'    <ul class="aui-list-truncate">',
								'        <li data-action=""><a href="javascript:void(0)" class="checkoutCommand_link" id="nothing">Sorry you don\'t have clone permission</a></li>',
								'    </ul>',
								'</div>'].join('\n'));
				jQuery('.pull-request-branches').append($link);
				return;
			}

			pr.fromRef.repository.links.clone.forEach(function(clone) {
				if(clone.name === 'ssh') {
					cloneUrl =clone.href;
				}
			});

			if(!cloneUrl) {
				cloneUrl = pr.fromRef.repository.links.clone[0].href;
			}

			var $link =  jQuery(['<a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger">',
								' -- Checkout -- ',
								'</a>',								
								'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
								'    <ul class="aui-list-truncate">',
								'        <li data-action="clone"><a href="javascript:void(0)" class="checkoutCommand_link" id="cloneCommand">Clone</a></li>',
								'        <li data-action="newremote"><a href="javascript:void(0)" class="checkoutCommand_link" id="remoteCommand">Add remote</a></li>',
								'        <li data-action="newremotenewbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Add remote/Create branch</a></li>',
								'        <li data-action="newbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Create branch</a></li>',
								'        <li data-action="checkout"><a href="javascript:void(0)" class="checkoutCommand_link">Checkout existing</a></li>',
								'    </ul>',
								'</div>'].join('\n'));

			var cloneCommand = 'git clone ' +  cloneUrl + ' ' + repoName + '_' + remoteName;
			var addOriginCommand = 'git remote add ' +  remoteName + ' ' + cloneUrl;
			var fetchCommand = 'git fetch ' + remoteName;
			var checkoutNewCommand = 'git checkout --track ' + remoteName + '/' + branchOrigin;
			var checkoutCommand = 'git checkout ' + branchOrigin;

			var command = '';
			var ddlClicked = false;

			jQuery('.pull-request-branches').append($link);
			jQuery('.checkoutCommand_link').click(function(e){
				ddlClicked = true;
				var action = jQuery(e.target).data('action') || jQuery(e.target).parent().data('action');
				console.log(action);
		    	switch(action) {
		    		case 'clone': command = cloneCommand; document.execCommand('copy'); break;
		    		case 'newremote': command = addOriginCommand + '; ' + fetchCommand + ';'; document.execCommand('copy'); break;
		    		case 'newremotenewbranch': command = addOriginCommand + '; ' + fetchCommand + '; ' + checkoutNewCommand; document.execCommand('copy'); break;
		    		case 'newbranch': command = fetchCommand + '; ' + checkoutNewCommand; document.execCommand('copy'); break;
		    		case 'checkout': command = fetchCommand + '; ' + checkoutCommand; document.execCommand('copy'); break;
		    		default: break;
		    	}
		    });

			jQuery('#cloneCommand').append(' (<span style="font-size:xx-small">'+repoName + '_' + remoteName+'</span>)');
			jQuery('#remoteCommand').append(' (<span style="font-size:xx-small">'+remoteName+'</span>)');


			jQuery(document).on('copy', function (e) {
				if(ddlClicked) {
				    e.preventDefault();
				    if (e.originalEvent.clipboardData) {
				        e.originalEvent.clipboardData.setData('text/plain', command);
				        auiFlag({
		                    type: 'info',
		                    title: 'Command copied!',
		                    body: 'just paste it in your terminal.', 
		                    close: 'auto'
		                });
				    } 
				    else if (window.clipboardData) {
				        auiFlag({
		                    type: 'info',
		                    title: 'Sorry copy api is not available!',
		                    body: 'Try to update your browser.', 
		                    close: 'auto'
		                });
				    }
				    
	                ddlClicked = false;
				}
			});			
	  	}

	  	//////////////////////////////////////////////////// display on overview page when there is conflicts
	  	function displayConflicts() {
	  		var pr = pageState.getPullRequest();

	  		// get pr changes details
	  		var url = '/rest/api/1.0' +  pr.link.url + '/changes'

	  		jQuery.get(url).done(function(prDetails) {
	  			var conflictsCount = 0;
	  			prDetails.values.forEach(function(details) {
	  				if(details.conflict) {
	  					conflictsCount++;
	  				}
	  			});

	  			if(conflictsCount > 0) {
	  				var $message = AJS.messages.warning({
					   title:"Conflicts found !",
					   body: "<p> There is "+conflictsCount+" conflicts. Please solve it. </p>",
					   closeable: true
					});

					jQuery('.pull-request-metadata').after($message);
	  			}
	  		});
	  	}

	  	return {
	  		addBuildLink: addBuildLink,
	  		attachNavigateToBranchLink: attachNavigateToBranchLink,
	  		addCheckoutLink: addCheckoutLink,
	  		displayConflicts: displayConflicts
	  	}
	});

	define('stash-plugin/header-notification', [
	    'aui',
	    'aui/flag',
	    'jquery',
	    'lodash',
	    'util/events',
	    'stash/api/util/state',
	    'stash/api/util/navbuilder',
	    'util/ajax',
	    'moment'
	], function (
	    AJS,
	    auiFlag,
	    jQuery,
	    _,
	    events,
	    pageState,
	    nav,
	    ajax,
	    moment
	) {
		'use strict';
		String.prototype.toBool = function(){
			return this.toString().toLowerCase() === 'true';
		};
		
		var NotificationType = { badge:'badge_', panel: 'panel_' };

	  	//////////////////////////////////////////////////// Toolbar icon functions
	  	var deferredPrRequest;

	  	function filterAnOrderActivities(activities) {
	  		var user = pageState.getCurrentUser();
	  		var returnedActivities = [];
	  		activities.forEach(function(activity){
	  			//if (activity.action == 'RESCOPED') {
					//return false;
				//}
				var outdated = false;
				if (activity.diff && activity.diff.properties) {
					outdated = !activity.diff.properties.current;
				}

				if (activity.action === 'COMMENTED' && !outdated && (activity.user.name !== user.name || countSubComments(activity.comment).total || countTasks(activity.comment).total)) {
					jQuery.extend(activity, {activityDate: getMostRecentActivityDate(activity.comment) });
					returnedActivities.push(activity);
				}
	  		});

	  		return _.sortBy(returnedActivities, 'activityDate').reverse();;
	  	}

	  	function getLastPRCommentsAsync() {
	  		var deferredResult = jQuery.Deferred();
			// get lastest PR
			var reqParams = { 
			    start: 0,
			    limit: 1000,    
			    avatarSize: 96,
			    withAttributes:true,
			    state: 'open',
			    order: 'oldest',
			    role: 'reviewer'
			};

			var urlPRReviewers = nav.newBuilder(['rest', 'inbox', 'latest', 'pull-requests']).withParams(reqParams).build();
			reqParams.role = 'author';
			var urlPRAuthor = nav.newBuilder(['rest', 'inbox', 'latest', 'pull-requests']).withParams(reqParams).build();

			var allPR = [];
			var firstDiferred = jQuery.get(urlPRReviewers).done(function(data){ jQuery.merge(allPR, data.values); });
			var secondDiferred = jQuery.get(urlPRAuthor).done(function(data){ jQuery.merge(allPR, data.values); });

			jQuery.when(firstDiferred, secondDiferred).done(function(){
			  var activities = [];
			  var requests = [];
			  // loop through PRs and request activities
			  allPR.forEach(function(pr){
			    requests.push(jQuery.get('/rest/api/1.0' + pr.link.url + '/activities?avatarSize=96').done(function(activityList){
			    	// get comments after PR was updated
			    	jQuery.each(activityList.values, function(index, activity){
						jQuery.extend(activity, { pullrequest: pr });
			        	activities.push(activity);
			    	});
			    }));
			  });

			  jQuery.when.apply(jQuery, requests).always(function(){
			  	activities = filterAnOrderActivities(activities);
			    deferredResult.resolve(activities);
			  });
			});	

			return deferredResult;
	  	}

	  	function getLastPRCommentsOnceAsync() {
	  		if (!deferredPrRequest || deferredPrRequest.state() === 'rejected') {  					
	  			deferredPrRequest = getLastPRCommentsAsync();
	  		}
	  		
	  		// return previous retried activities
			return deferredPrRequest.promise();
	  	}

	  	function getMostRecentActivityDate(comment) {		
			var date = comment.createdDate;		

			comment.tasks.forEach(function(task){
				date = task.createdDate > date ? task.createdDate : date;
			});

			comment.comments.forEach(function(subcomment){
				var newDate = getMostRecentActivityDate(subcomment);
				date = newDate > date ? newDate : date;
			});

			return date;
		}

	  	function filterSubcomments(comment) {
			var user = pageState.getCurrentUser();
			return _.filter(comment.comments, function(c){ return c.author.name !== user.name; });
	  	}

	  	function filterTasks(comment) {
			var user = pageState.getCurrentUser();
			return _.filter(comment.tasks, function(t){ return t.author.name !== user.name && t.state === "OPEN"; });
	  	}

		function countSubComments(comment) {		
			var count = { total: 0, unread: 0 };
			var subCommentsFromOthers = filterSubcomments(comment);	
			count.total += subCommentsFromOthers.length;
			count.unread += _.filter(subCommentsFromOthers, function(c){ return !c.isPanelRead }).length;

			comment.comments.forEach(function(subcomment){
				var result = countSubComments(subcomment);
				count.total += result.total;
				count.unread += result.unread;
			});

			return count;
		}

		function countTasks(comment) {
			var count = { total: 0, unread: 0 };
			var taskFromOthers = filterTasks(comment);
			count.total += taskFromOthers.length;
			count.unread += _.filter(taskFromOthers, function(t){ return !t.isPanelRead }).length;

			comment.comments.forEach(function(subcomment){
				var result = countTasks(subcomment);
				count.total += result.total;
				count.unread += result.unread;
			});

			return count;
		}

		function countUnreadActivities(activities, prefix) {
			prefix = prefix || '';
			var count = 0;		
			var user = pageState.getCurrentUser();

			activities.forEach(function(activity){
				// verify the comment itself
				var isCommentRead = (localStorage.getItem(prefix + 'comment_' + activity.comment.id) || false).toString().toBool();
				
				if (prefix === NotificationType.panel) {
					jQuery.extend(activity.comment, {isPanelRead: isCommentRead });
				}  
				else {
					jQuery.extend(activity.comment, {isBadgeRead: isCommentRead });
				}

				count +=  isCommentRead ? 0 : activity.comment.author.name !== user.name ? 1 : 0;

				// sub comments
				activity.comment.comments.forEach(function(subComment){
					// count sub sub comments
					count += countUnreadActivities([{ comment: subComment }], prefix);
				});

				// tasks
				filterTasks(activity.comment).forEach(function(task){
					var isTaskRead = (localStorage.getItem(prefix + 'task_' + task.id) || false).toString().toBool();
					if (prefix === NotificationType.panel) {
						jQuery.extend(task, {isPanelRead: isTaskRead });
					}  
					else {
						jQuery.extend(task, {isBadgeRead: isTaskRead });
					}
					count += isTaskRead ? 0 : 1;
				});
			});

			// if false continue to verify tasks
			return count;
		}

		function hasUnreadActivities(activity, prefix) {
			return countUnreadActivities([activity], prefix) > 0;
		}

		var htmlComments = {};
	  	function markdownToHtml(msg, msgId) {
	  		if (htmlComments[msgId]) {
	  			return jQuery.Deferred().resolve(htmlComments[msgId]).promise();
	  		}

	  		var url = nav.rest().markup().preview().build();
			return ajax.rest({
	            type: 'POST',
	            url: url,
	            data: msg,
	            dataType: 'json'
	        }).then(function(result){
	        	htmlComments[msgId] = result.html;
	        	return result.html;
	        });
	  	} 	

	  	function findUserBySlug(slug) { 
			var url = nav.rest().users().addPathComponents(slug).withParams({avatarSize:64}).build();

			return jQuery.ajax({
			    type: 'GET',
			    url: url,
			    dataType: 'json'
			});
		}
	  	
		function markActivitiesAsRead(activities, prefix) {
			prefix = prefix || '';
			activities.forEach(function(activity){
				localStorage.setItem(prefix + 'comment_' + activity.comment.id, true);
				
				activity.comment.comments.forEach(function(subComment){
					markActivitiesAsRead([{ comment:subComment }], prefix);
				});

				activity.comment.tasks.forEach(function(task){
					localStorage.setItem(prefix + 'task_' + task.id, true);
				});
			});	
		}

		function generateCommentsTable(activities) {
			var $table = jQuery('<table></table>')
							.addClass('aui')
							.addClass('paged-table')
							.addClass('comments-table');
					
			// header
			$table.append('<thead>').find('thead').append('<tr>').find('tr')
				.append('<th class="author">Author</th>')
				.append('<th class="comment">Comment</th>')
				.append('<th class="title">PR</th>')
				.append('<th class="updated">Updated</th>')
				.append('<th class="comment-count">Activities</th>');

			// body			
			var $tbody = $table.append('<tbody>').find('tbody');
			activities.forEach(function(activity) {
				var $msgRow = jQuery('<td class="comment message markup">'+activity.comment.text+'</td>');
				var $userRow = jQuery('<td class="author">'+activity.comment.author.name+'</td>');
				var $countRow = jQuery('<td class="comment-count"></td>');
				var $prRow = jQuery('<td class="title"><a href="'+activity.pullrequest.link.url+'/overview?commentId='+activity.comment.id+'" title="{'+activity.pullrequest.author.user.name+'} '+activity.pullrequest.title+'">'+activity.pullrequest.title+'</a></td>');
				var $updatedRow = jQuery('<td class="comment-count"></td>').html(moment(activity.activityDate).fromNow());

				var isLineUnread = hasUnreadActivities(activity, NotificationType.panel);
				var isBadgeUnread = hasUnreadActivities(activity, NotificationType.badge);

				// convert raw msg to html
				markdownToHtml(activity.comment.text, activity.comment.id).done(function(msg) {
					$msgRow.html(msg);
				});
				
				// avatar
				var $avatar = jQuery(stash.widget.avatar({
	                size: 'small',
	                person: activity.comment.author,
	                tooltip: activity.comment.author.displayName
	            }));
				$userRow.html($avatar);
				$avatar.find('img').tooltip();

				// sub comments count
				var commentCount = countSubComments(activity.comment);
	            var $commentsCount = jQuery('<span class="comment-count" title="' + commentCount.unread + ' new unread comments">');
	            $commentsCount.append(jQuery(aui.icons.icon({
	                useIconFont: true,
	        		icon: 'comment',
	        		accessibilityText: 'comments'               
	            })));
	            var $commentDigit = jQuery('<span>' + commentCount.total + '<span>');
	            if(commentCount.unread > 0) {
	            	$commentsCount.addClass('digit-unread');
	            }
	            $commentsCount.append($commentDigit);
	            $commentsCount.tooltip();

	            // task count
	            var taskCount = countTasks(activity.comment);
	            var $tasksCount = jQuery('<span class="pr-list-open-task-count" title="' + taskCount.unread + ' new unread tasks">');
	            $tasksCount.append(jQuery(aui.icons.icon({
	                useIconFont: true,
	        		icon: 'editor-task',
	        		accessibilityText: 'tasks'               
	            })));
	            var $taskDigit = jQuery('<span class="task-count">' + taskCount.total + '<span>');
	            if(taskCount.unread > 0) {
	            	$tasksCount.addClass('digit-unread');
	            }
	            $tasksCount.append($taskDigit);
	            $tasksCount.tooltip();
	            
	            // append to cell
	            $countRow
	                .append($commentsCount)
	                .append($tasksCount);

	            // build row
				var $tr = $tbody.append('<tr>').find('tr:last-child');
				if(isLineUnread) {
					$tr.addClass('line-unread');
				}
				if (isBadgeUnread) {
					$tr.addClass('line-unread-strong');
				}

				$prRow.find('a').tooltip();

				$tr.append($userRow)
					.append($msgRow)
					.append($prRow)
					.append($updatedRow)
					.append($countRow);				
			});

			if (activities.length === 0) {
				$table = AJS.messages.info({
				   title:"No comments",
				   body: "<p> There is no comment on any open pull request! </p>",
				   closeable: false
				});
			}

			return $table;
		}

		function updateChromeIconBadge(badgeText) {
			if (typeof chromeExtId !== 'undefined') {
				chrome.runtime.sendMessage(chromeExtId, { action: 'setBadgeCount', badgeCount: badgeText.toString() });
			}
		}

		function updateUI($content, forceReload, desktopNotification) {
	  		forceReload = forceReload || false;
	  		desktopNotification = desktopNotification || false;
	  		var $toolbar = jQuery('#inbox-messages');

	  		// display loader in panel
	  		if($content) {
		  		var $spinner = jQuery('<div class="loading-resource-spinner"></div>');
		  		jQuery('#global-div-comments-notif').remove();
				var $globalDiv = jQuery('<div id="global-div-comments-notif"></div>');
				$globalDiv.append('<h2>Last pull requests comments</h2>');
				$globalDiv.append($spinner);
		        $content.empty().append($globalDiv);
		        $spinner.show().spin('medium');
	    	}

	    	var dataLoader = forceReload ? getLastPRCommentsAsync : getLastPRCommentsOnceAsync;
	  		dataLoader()
	  		.always(function() {
	  			if($content) {
	  				$content.empty();
	            	$spinner.spinStop().remove();
	            }
	        })
	        .done(function(activities) {
	        	// desktop notification on chrome
	        	if (!$content && desktopNotification) {
	        		displayDesktopNotification(activities);
	        	}
				// update icon
				var eventCount = countUnreadActivities(activities, NotificationType.badge);
				if(!$content) {
					$toolbar.find('.aui-badge').remove();
					updateChromeIconBadge('');
					if (eventCount > 0) {
						var $badge = jQuery(aui.badges.badge({
					                	text: eventCount
				            		}));
						$toolbar.append($badge);
						setTimeout(function() {
						    // Needed for the transition to trigger
						    $badge.addClass('visible');
						}, 0);

						updateChromeIconBadge(eventCount);
					}
				}			

				// update panel	
				if($content) {
					jQuery('#global-div-comments-notif').remove();
					var $globalDiv = jQuery('<div id="global-div-comments-notif"></div>');
					$globalDiv.append('<h2>Last pull requests comments</h2>');
					var $wrapper = jQuery('<div class="inbox-table-wrapper aui-tabs horizontal-tabs"></div>');
					$wrapper.append(generateCommentsTable(activities));
					$globalDiv.append($wrapper);
					$content.append($globalDiv);
					// remove badge notification. Panel highlight notification are remove when PR is open
					markActivitiesAsRead(activities, NotificationType.badge);			
				}		
			});
	  	}

	  	function createCommentsDialog() {
	  		var inlineDialog;

	  		var onShowDialog = function ($content, trigger, showPopup) {
		        showPopup();
		        jQuery(document).on('keyup', hideOnEscapeKeyUp);

		        // hide if another dialog is shown
				AJS.dialog2.on('show', hideOnDialogShown);

		        updateUI($content);
		    };

			var hideOnEscapeKeyUp = function(e) {
			    if(e.keyCode === jQuery.ui.keyCode.ESCAPE) {
			        inlineDialog.hide();
			        e.preventDefault();
			    }
			};

		    var onHideDialog = function () {
		        jQuery(document).off('keyup', hideOnEscapeKeyUp);
				AJS.dialog2.off('show', hideOnDialogShown);

		        if (jQuery(document.activeElement).closest('#inbox-messages-content').length) {
		            // if the focus is inside the dialog, you get stuck when it closes.
		            document.activeElement.blur();
		        }

		        // refresh icon notify count
		        updateUI();
		    };

		    var hideOnDialogShown = function () {
				inlineDialog.hide();
			};

			var $inboxTrigger = jQuery("#inbox-messages");
			if ($inboxTrigger.length && pageState.getCurrentUser()) {
	            inlineDialog = AJS.InlineDialog($inboxTrigger, 'inbox-messages-content', onShowDialog, {
	                width: 870,
	                hideCallback: onHideDialog
	            });            

	            /*var _approvalHandler = function() {
	                getLastPRCommentsAsync();
	                updateUI();
	            };

	            events.on('stash.feature.comments.commentAdded', _approvalHandler);
	            events.on('stash.feature.comments.commentEdited', _approvalHandler);*/
	        }

	        return inlineDialog;
	  	}
	  	
	  	function getSiteBaseURl() {
	  		return location.protocol + '//' + location.host;
	  	}

	  	function displayDesktopNotification(activities) {
	  		if(Notification.permission !== "granted") {
	  			return;
	  		} 
	  		var user = pageState.getCurrentUser();
			var prefix = "notif_";

			activities.forEach(function(activity){
				var commentKey = prefix + 'comment_' + activity.comment.id;
				var state = localStorage.getItem(commentKey);
				localStorage.setItem(commentKey, true);				

				if(Notification.permission === "granted" && activity.comment.author.name !== user.name && !(state || false).toString().toBool()) {
					var commentNotifTitle = activity.comment.author.name +' commented on : "' + activity.pullrequest.title + '"';
					var notification = new Notification(commentNotifTitle, {
				      icon: activity.comment.author.avatarUrl || window.stashIcon,
				      body: activity.comment.text,
				      eventTime: activity.comment.createdDate,
				      isClickable: true
				    });

				    notification.onclick = function () {
				      window.open(getSiteBaseURl() + activity.pullrequest.link.url + '/overview?commentId=' + activity.comment.id);
				    };				    
				}

				activity.comment.comments.forEach(function(subComment){
					displayDesktopNotification([{ comment:subComment, pullrequest: activity.pullrequest }]);
				});

				activity.comment.tasks.forEach(function(task){
					var taskKey = prefix + 'task_' + task.id;
					var taskState = localStorage.getItem(taskKey);
					localStorage.setItem(taskKey, true);
					
					if(Notification.permission === "granted" && task.author.name !== user.name && !(taskState || false).toString().toBool()) {
						var taskNotifTitle = activity.comment.author.name +' created task on : "'+ activity.pullrequest.title +'"';				
						var notification = new Notification(taskNotifTitle, {
					      icon: task.author.avatarUrl || window.stashIcon,
					      body: task.text,
					      eventTime: task.createdDate,
					      isClickable: true
					    });

					    notification.onclick = function () {
					      window.open(getSiteBaseURl() + activity.pullrequest.link.url + '/overview?commentId=' + activity.comment.id);    
					    };
					}
				    
				});
			});
	  	}

	  	function addMessagesToolbarIcon() {
	  		/// toolbar icon
			var button = ['<li class="" title="Last PR messages">',
				    '<a href="#inbox-messages" id="inbox-messages" title="Last PR messages">',
				        '<span class="aui-icon aui-icon-small aui-iconfont-hipchat"></span>',
				    '</a>',
				'</li>'].join('\n');


			jQuery('.help-link').after(button);
			
			updateUI(false, false, true);
			createCommentsDialog();

			// as desktop notification authorization
			if (Notification.permission !== "granted") {
			   	Notification.requestPermission();
			}

			// periodically poll server for update
			if (typeof chromeExtId !== 'undefined') {
				// use background worker to centralized request and avoid to much server queries				
				chrome.runtime.sendMessage(chromeExtId, { action: 'setUrl', url: getSiteBaseURl() });
				document.addEventListener('ActivitiesRetrieved', function (eventArgs) {			
					var activities = filterAnOrderActivities(eventArgs.detail.activities);
					if (deferredPrRequest.state() !== 'pending') {
						deferredPrRequest = jQuery.Deferred();
						deferredPrRequest.resolve(activities);
						updateUI(false, false, eventArgs.detail.desktopNotification);
					}
				}, false);
			}
			else {
				// firefox 
				// TODO: add it into background worker to avoid multiple request per page  
				/*setInterval(function(){ 
	  				updateUI(false, true, true);	  									
				}, 60000);*/
			}
	  	}

	  	function markActivitiesAsReadWhenPullRequestOpened() {
	  		var pr = pageState.getPullRequest();
	  		if (pr) {
	  			getLastPRCommentsOnceAsync().done(function(activities){
	  				activities = _.filter(activities, function(a){ return a.pullrequest.id === pr.id; });
	  				markActivitiesAsRead(activities, NotificationType.badge);
	  				markActivitiesAsRead(activities, NotificationType.panel);
	  			});  			
	  		}
	  	}

	  	return {
	  		addMessagesToolbarIcon: addMessagesToolbarIcon,
			markActivitiesAsReadWhenPullRequestOpened: markActivitiesAsReadWhenPullRequestOpened
	  	}
	});

	define('stash-plugin/pullrequest-list-page', [
	    'aui',
	    'aui/flag',
	    'jquery',
	    'lodash',
	    'util/events',
	    'util/ajax',
	    'stash/api/util/state',
	    'stash/api/util/navbuilder',
	    'feature/pull-request/pull-request-table',
	    'widget/searchable-multi-selector',
	    'feature/user/user-multi-selector',
	    'widget/avatar-list',
	    'feature/repository/branch-selector'
	], function (
	    AJS,
	    auiFlag,
	    jQuery,
	    _,
	    events,
	    ajax,
	    pageState,
	    nav,
	    PullRequestsTable,
	    SearchableMultiSelector,
	    UserMultiSelector,
	    avatarList,
	    BranchSelector
	) {
		'use strict';
		//////////////////////////////////////////////////// Add filter to Pull Request list
	  	// utilities
	    function getParameterByName(name) {
	        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	            results = regex.exec(location.search);
	        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	    }

	  	function addPrFilters() { 
	  		jQuery('.spinner').show();
		    //redefined filter builder to include new parameters
		    PullRequestsTable.prototype.buildUrl = function (start, limit) {
		        var self = this;
		        var builder = self.getPullRequestsUrlBuilder()
		            .withParams({
		                start: start,
		                limit: limit,
		                avatarSize: stash.widget.avatarSizeInPx({ size: 'medium' }),
		                withAttributes: true
		            });

		        if (self.prDirection) {
		            builder = builder.withParams({
		                direction: self.prDirection
		            });
		        }
		        if (self.prSource) {
		            builder = builder.withParams({
		                at: self.prSource
		            });
		        }
		        if (self.prState) {
		            builder = builder.withParams({
		                state: self.prState
		            });
		        }
		        if (self.prOrder) {
		            builder = builder.withParams({
		                order: self.prOrder
		            });
		        }

		        if (self.prAuthors && self.prAuthors.length) {	
		            self.prAuthors.forEach(function(u, index){
		                var params = {};
		                params["username." + (index + 1)] = u.name;
		                params["role." + (index + 1)] = "AUTHOR";            
		                builder = builder.withParams(params); 
		            });        
		        }

		        if (self.prReviewers && self.prReviewers.length) {    
		            self.prReviewers.forEach(function(u, index){
		                var params = {};
		                params["username." + (index + 1)] = u.name;
		                params["role." + (index + 1)] = "REVIEWER";            
		                builder = builder.withParams(params); 
		            });        
		        }

		        if (self.prParticipants && self.prParticipants.length) {    
		            self.prParticipants.forEach(function(u, index){
		                var params = {};
		                params["username." + (index + 1)] = u.name;
		                params["role." + (index + 1)] = "PARTICIPANT";            
		                builder = builder.withParams(params); 
		            });        
		        }

		        if (self.prApprovers && self.prApprovers.length) {    
		            self.prApprovers.forEach(function(u, index){
		                var params = {};
		                params["username." + (index + 1)] = u.name;
		                params["approved." + (index + 1)] = true; 
		                params["role." + (index + 1)] = "REVIEWER";          
		                builder = builder.withParams(params); 
		            });        
		        }

		        return builder.build();
		    };

		    function getPullRequestsUrlBuilder(state) {
		        return nav.rest().currentRepo().allPullRequests().withParams({ state: state });
		    }

		    // recreate table to control it
		    var state = getParameterByName('state') || 'OPEN';
		    var order = state.toLowerCase() === 'open' ? 'oldest' : 'newest';

		    var notFoundMsg = AJS.messages.info({
		               title:"No Results",
		               body: '<p><a href="?create" class="aui-button aui-button-primary intro-create-pull-request" tabindex="0">Create a new pull request</a></p>',
		               closeable: false
		            });

	        var fakeResult = {"size":0,"limit":0,"isLastPage":false,"values":[{"id":8,"version":2,"title":"loading...","description":"loading...","state":"OPEN","open":false,"closed":true,"createdDate":1373011695000,"updatedDate":1373012559000,"locked":false,"author":{"user":{"name":"none","emailAddress":"none","id":16777,"displayName":"none","active":true,"slug":"none","type":"NORMAL", "avatarUrl":"#"},"role":"AUTHOR","approved":false},"reviewers":[],"participants":[],"attributes":{"resolvedTaskCount":["0"],"openTaskCount":["0"]}, toRef:{id:0, displayId:'', repository:{id:0, slug:'', project:{key:''}}}, fromRef:{id:0, displayId:'', repository:{id:0, slug:'', project:{key:''}}}}],"start":0,"nextPageStart":0};        	
	        
	        // remove previous
	  		jQuery(window).off('scroll.paged-scrollable');
		    jQuery('#pull-requests-table').remove();
		    jQuery('.spinner').remove();
		    jQuery('.paged-table-message').remove();
		    // add container for new
		    jQuery('.pull-requests-content').append('<div id="pull-requests-table-container-filtered"></div>');

		    var pullRequestTable = new PullRequestsTable(state, order, getPullRequestsUrlBuilder, {
		        noneFoundMessageHtml: notFoundMsg,
		    	initialData: fakeResult,
		    	paginationContext: 'pull-request-table-filtered',
		    	//target: "#pull-requests-table-filtered",
				container: "#pull-requests-table-container-filtered",
        		tableMessageClass: "pull-request-table-message-filtered",
        		autoLoad: true
		    });


		    // add missing properties
		    pullRequestTable.prAuthors = [];
		    pullRequestTable.prReviewers = [];
		    pullRequestTable.prParticipants = [];
		    pullRequestTable.prApprovers = [];

		    pullRequestTable.init();
		    pullRequestTable.update();
		    avatarList.init();

		    // inject filter UI
		    var urlParams = {
		        avatarSize: stash.widget.avatarSizeInPx({ size: 'xsmall' }),
		        permission: 'LICENSED_USER' // filter out non-licensed users
		    };
		    var dataSource = new SearchableMultiSelector.PagedDataSource(nav.rest().users().build(), urlParams);

		    // create form
		    var $auiContainer = jQuery('<div class="filter-group-container"></div>');
		    var $auiItem = jQuery('<div class="filter-group-content"></div>');
		    var $form = jQuery('<form class="aui prevent-double-submit" action="#" method="get" accept-charset="UTF-8"></form>');
		    $auiContainer.append($auiItem);
		    $auiItem.append($form);

		    var $authorsInput = jQuery('<input class="text" type="text" name="authors" id="authors" placeholder="Authors filter">');
		    $form.append($authorsInput);

		    var $reviewersInput = jQuery('<input class="text" type="text" name="reviewers" id="reviewers" placeholder="Reviewers filter">');
		    $form.append($reviewersInput);

		    var $participantsInput = jQuery('<input class="text" type="text" name="participants" id="participants" placeholder="Participants filter">');
		    $form.append($participantsInput);

		    var $approversInput = jQuery('<input class="text" type="text" name="approvers" id="approvers" placeholder="Approvers filter">');
		    $form.append($approversInput);

		    var $orderSelect = jQuery(['<select name="ddPrOrder" id="ddPrOrder">',
		    	'<option value="oldest">Oldest first</option>',
		    	'<option value="newest">Newest first</option>',
		    	'</select>'].join('\n'));	    
		    $orderSelect.val(pullRequestTable.prOrder);
		    $form.append($orderSelect);	

		    var $directionSelect = jQuery(['<select name="ddPrDirection" id="ddPrDirection">',
		    	'<option value="INCOMING">Incoming</option>',
		    	'<option value="OUTGOING">Outgoing</option>',
		    	'</select>'].join('\n'));
		    $directionSelect.val(pullRequestTable.prDirection || 'INCOMING');
		    $form.append($directionSelect); 

		    var $branchDropdown = jQuery('<button></button>', {
		    	id: 'prSourceSelector',
		    	type: 'button',
		    	class: 'aui-button searchable-selector-trigger revision-reference-selector-trigger sourceBranch',
		    	title: 'Select branch'
		    }); 
		    $branchDropdown.append('<span class="placeholder">Select branch</span>');  
		    var branchSelector = new BranchSelector($branchDropdown, {
			    id: 'prSourceBranchSelector',
			    show: { branches: true, tags: false },
			    paginationContext: 'branch-filter-selector'
			});
			$form.append($branchDropdown); 

		    new UserMultiSelector($authorsInput, {
		        initialItems: [],
		        dataSource: dataSource,
		        placeholder: "Authors filter"
		    }).on("change", function() {
		        pullRequestTable.prAuthors = this.getSelectedItems();
		        pullRequestTable.update();       
		    });

		    new UserMultiSelector($reviewersInput, {
		        initialItems: [],
		        dataSource: dataSource,
		        placeholder: "Reviewers filter"
		    }).on("change", function() {
		        pullRequestTable.prReviewers = this.getSelectedItems();
		        pullRequestTable.update();                 
		    });

		    new UserMultiSelector($participantsInput, {
		        initialItems: [],
		        dataSource: dataSource,
		        placeholder: "Participants filter"
		    }).on("change", function() {
		        pullRequestTable.prParticipants = this.getSelectedItems();
		        pullRequestTable.update();                 
		    });

		    new UserMultiSelector($approversInput, {
		        initialItems: [],
		        dataSource: dataSource,
		        placeholder: "Approvers filter"
		    }).on("change", function() {
		        pullRequestTable.prApprovers = this.getSelectedItems();
		        pullRequestTable.update();                
		    });

		    $orderSelect.auiSelect2({minimumResultsForSearch: Infinity, width: 'auto' }).on('change', function(e){
		    	pullRequestTable.prOrder = e.val;
		        pullRequestTable.update();
		    });	    
		    $directionSelect.auiSelect2({minimumResultsForSearch: Infinity, width: 'auto'}).on('change', function(e){	  
		    	pullRequestTable.prDirection = e.val;
		        pullRequestTable.update();
		    });

		    events.on('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', function(e) {
		    	pullRequestTable.prSource = e.id;
		        pullRequestTable.update();
		    });

		    events.on('stash.feature.pullRequestsTable.contentAdded', function(data) {
		    	var $previousStickers = jQuery('#totalResultStamp');
		    	
		    	var previousSize = 0;
		    	if (data && data.start > 0) {
		    		previousSize = parseInt($previousStickers.data('size') || 0);
		    	}

		    	$previousStickers.remove();

		    	var size = (data && data.size ? data.size : 0) + previousSize;
		    	var $stamps = jQuery('<span id="totalResultStamp" class="aui-lozenge declined aui-lozenge-subtle pull-request-state-lozenge aui-lozenge-complete"></span>')
						    	.html('Total: ' + size)
						    	.data('size', size);
		    	jQuery('#prSourceSelector').after($stamps);
		    });
		    
		    events.on('stash.widget.pagedscrollable.dataLoaded', function(start, limit, data) {
		    	if (start !== 0) {
		    		return;
		    	}
		    	var emptyData = {
						displayId: "All Branches",
						id: "",
						isDefault: false
					};
		    	data.values.splice(0, 0, emptyData);
		    	branchSelector.scrollableDataStores[0] = branchSelector.scrollableDataStores[0] || [];
		    	branchSelector.scrollableDataStores[0].splice(0, 0, emptyData);
		    	if(this.options.paginationContext === 'branch-filter-selector') {
		    		this.$scrollElement.find('ul').prepend('<li class="result"><a href="#" data-id="" tabindex="-1"><span class="aui-icon aui-icon-small aui-iconfont-nav-children">Branch</span><span class="name" title="All Branches" data-id="" data-revision-ref="{"id":"","displayId":"All Branches", "isDefault":false,"type":{"id":"branch","name":"Branch"}}">All Branches</span></a></li>');
		    	}
		    });

		    // append filter
		    jQuery('.pull-requests-content .aui-tabs').after($auiContainer);

		    // fix placeholder bug
		    $authorsInput.data('select2').blur();
		    $reviewersInput.data('select2').blur();
		    $participantsInput.data('select2').blur();
		    $approversInput.data('select2').blur();   
	  	}

	  	return {
	  		addPrFilters: addPrFilters
	  	}
	});

	//jQuery( document ).ready(function() {
		// stash page must have require function
		if(typeof require === 'undefined')
			return;

		var pageState;
		var loadRequirement = jQuery.Deferred();

        // FIX ISSUE: https://github.com/dragouf/Stash-Reviewers-Chrome-Extension/issues/5#issue-138328819
        var loadAuiFlag = jQuery.Deferred();
        WRM.require("wr!" + 'com.atlassian.auiplugin:aui-flag').then(function(d) {
            loadAuiFlag.resolve();
            // To test it, put this on chrome console: require('aui/flag')
        });

		try {
			pageState = require('stash/api/util/state');
			loadRequirement.resolve();
		}
		catch (ex) {
			WRM.require("wr!" + 'com.atlassian.stash.stash-web-api:state').then(function(){
				pageState = require('stash/api/util/state');
				loadRequirement.resolve();
			});
		}
		
		jQuery.when(loadRequirement, loadAuiFlag).done(function() {
			var user = pageState.getCurrentUser();
			var project = pageState.getProject();
			var repository = pageState.getRepository();
			var pullRequest = pageState.getPullRequest();

			if(user) {
				require(['stash-plugin/header-notification'], function(notification) {
					notification.addMessagesToolbarIcon();

					if(!project) {
						// main page
					}
					else if(project && !repository) {
						// project page
					}
					else if(project && repository && !pullRequest) {
						// repository page
						
						// PR sticker on branch details page
						require(['stash-plugin/branch-details-page', 'stash/api/util/events'], function(branchUtils, events){
							branchUtils.addForkOriginLink();
							branchUtils.loadPRStickers();
						    events.on('stash.layout.branch.revisionRefChanged', function(e) {
						      jQuery('#pr-status-wrapper').remove();
						      var branchId = e.attributes.id;
						      branchUtils.loadPRStickers(branchId);
							});
						});

						// PR Reviewers groups (create page)
						require(['stash-plugin/pullrequest-create-page', 'aui'], function(prCreateUtil, AJS){ 
							prCreateUtil.injectReviewersDropdown(jsonGroups);						
						});

						// PR Filter
						try {
							// are we on the pull request list page ? raise exception if not
					    	require('feature/pull-request/pull-request-table'); 

					    	// load missing resources
					    	var selectorRes = WRM.require("wr!" + 'com.atlassian.stash.stash-web-plugin:searchable-multi-selector');
							var userRes = WRM.require("wr!" + 'com.atlassian.stash.stash-web-plugin:user-multi-selector');
							var branchSelector = WRM.require("wr!" + 'com.atlassian.stash.stash-web-plugin:repository-branch-selector');

							jQuery.when(selectorRes, userRes, branchSelector).done(function() {	
								require(['stash-plugin/pullrequest-list-page'], function(prListUtil){
									prListUtil.addPrFilters();
								});
							});
					 	}
					 	catch(e) {}
					}
					else if (pullRequest) {
						require(['stash-plugin/pullrequest-details-page', 'stash-plugin/pullrequest-create-page'], function(prDetailsPage, prCreateUtil){
							// Jenkins build link
							//prDetailsPage.addBuildLink();
							// Clickable branch info
							prDetailsPage.attachNavigateToBranchLink();
							// Add checkout command link
							prDetailsPage.addCheckoutLink();
							// add conflict warning message
							prDetailsPage.displayConflicts();
							// Change notification read state
							notification.markActivitiesAsReadWhenPullRequestOpened();
							// Reviewers groups (edit page)
							AJS.bind("show.dialog", function() {
							  	prCreateUtil.injectReviewersDropdown(jsonGroups);
							});
						});
					}
				});
			}
		});	
	//});
}());
// Note: to see all stash events add ?eve=* to URL