/*!
 * jQuery multipyInput beta 1.0
 *
 * @date: 2016-08-08 
 *
 * @author: gong yuwen
 *
 */
+function($){
    
    var __FILE__ = $('script').last().attr('src').replace(/(?:[\w\.]+$)/, '');

    var pluginName = 'multipyInput';
    
    var BasicRegs = {
        'Mobile':    /^(?:(?:\+\d+\s?)?(?:\d\s?)?(?:\(\d(?:\s?-\s?)?\d*\))?(?:[\s-\.]?\d+)*)$/     
    };
    var keys = {
        UP: 38,
        DOWN: 40,
        ENTER: 13,
        ESC: 27,
        PLUS: 43,
        A: 65,
        Z: 90,
        SPACE: 32,
        TAB: 9
    };
    function Plugin(element, options) 
    {
        this.$multiInput = $(element);
        this.options = options;
        this.ns = '.' + pluginName;
        
        this.defaultPlaceHolder = this.$multiInput.prop('placeholder');
        
        this.$selectedFlag;
        
        this.$countryList;
        
        this.phoneUtil;
        
        this.allCountry;
        
        this.selectedCountryData;
        
        this.timer;
    }
    Plugin.prototype = {
        _init: function()
        {
            this._generateFlag();
            
            this._initListeners();
            
            this._initRequest();
        },
        _generateFlag: function()
        {
            if( this.allCountry && this.allCountry[0] )
            {
                var clone = new Object();
                
                for( var i in this.allCountry )
                {
                    var record = this.allCountry[i];
                    
                    var $item = $('<li>', { 'data-idn': record.IDN, 'data-idc': record.IDC });
                    
                    var $itemFlagContainer = $('<div>', { 'class': 'flag-container'} ).appendTo( $item );
                    
                    $('<div>', { 'class': 'flag-item ' + record.IDN }).appendTo( $itemFlagContainer );
                    
                    $('<span>', { 'class': 'country-name'} ).text( record['name'] ).appendTo( $item );
                    
                    $('<span>', { 'class': 'dial-code'} ).text( '+' + record.IDC ).appendTo( $item );
                    
                    $item.appendTo( this.$countryList );
                    
                    var index = record.IDC.substr(0, 1);
                    if( clone[ index ] == undefined )
                        clone[ index ] = new Object();
                    clone[ index ][ record.IDC ] = { index: i, IDN: record.IDN };
                }
                this.allCountry = clone;    
            }
            else
            {
                this.$multiInput.wrap( $('<div>', { 'class': 'multipyInput-container'}));
                
                var $flagContainer = $('<div>',{ 'class': 'flag-container dn' ,tabindex: 0 }).insertBefore( this.$multiInput );
                
                this.$selectedFlag = $('<div>', { 'class': 'selected-flag' }).appendTo( $flagContainer );
                
                var $selectedFlagInner = $('<div>', { 'class': 'flag-item'} ).appendTo( this.$selectedFlag );
        
                $selectedFlagInner.after($('<div>',{ 'class': 'flag-arrow'}));
                
                this.$countryList = $('<ul>', { 'class': 'country-list dn'}).insertAfter( this.$selectedFlag );

            }
        },
        _initListeners: function()
        {
            var that = this;
            //load datas complete
            this.$multiInput.on('loadComplete'+ this.ns, function(){
                that._generateFlag();
            })
            .on('keyup' + this.ns, function(){
                if ( that.timer )
                    clearTimeout( that.timer );

                that._analysisValue( this );
                
                that.timer = setTimeout(function() {
                    var query = 1;
                }, 1e3);
                
            })
            .on("cut" + this.ns + " paste" + this.ns, function(){
                that._analysisValue( this );
            });
        },
        _initRequest: function()
        {
            var that = this;
            var tasks = [
                $.getScript( __FILE__ + 'utils.js').done(function(){
                    that.phoneUtil = window.intlTelInputUtils;
                    if( that.allCountry != undefined )
                        that.$multiInput.trigger('loadComplete'+ that.ns);
                }),
                $.getJSON( __FILE__ + 'country.json').done(function( response ){
                    that.allCountry = response;
                    if( that.phoneUtil != undefined )
                        that.$multiInput.trigger('loadComplete'+ that.ns);
                })
            ];
            $.when( tasks );
        },
        _analysisValue: function( element )
        { 
            var value = $.trim( element.value );
            
            var prevType = this._getMatchType();
            
            if( value.length > 0 && this.allCountry && this.allCountry[0] == undefined )
            {
                if( BasicRegs['Mobile'].test( value ) )
                {
                    var currentType = 'Mobile';
                    
                    this._analysisMobile( value );
                }
                else
                {   
                    var currentType = 'Other';
                    
                    this._reset();                    
                }
            }
            else if( value.length == 0 )
            {
                var currentType = 'Default';
                
                this.selectedCountryData = null;
                this._reset();
            }
            if( prevType != currentType )
            {
                var e = $.Event('typechange' + this.ns, { multiInputType: currentType });
                this.$multiInput.trigger( e );
            }
        },
        _analysisMobile: function( value )
        {
            value = value.replace(/[\(\)\s+]+/g, '');
            
            if( this.$selectedFlag.is(':hidden') || value.length <= 4 )
            {
                var tmps = this.allCountry[ value.substr(0, 1) ];
                
                var selectedLen = 0;
                
                var selectedIndex;
                
                for( var i in tmps )
                {
                    if( value.indexOf(i) == 0 )
                    {
                        if( i.length > selectedLen )
                        {
                            selectedLen = i.length;    
                            selectedIndex = tmps[i].index;
                        }
                    }
                }  
                var $currentItem = $('li:eq('+ selectedIndex +')', this.$countryList);

                this._setSelectedFlag( $currentItem );  
            }
        },
        _setSelectedFlag: function( $item )
        {
            var that = this;
            
            this.selectedCountryData = { index: $item.index(), IDN: $item.data('idn'), IDC: $item.data('idc') };

            $('.flag-item', this.$selectedFlag).removeAttr('class').addClass('flag-item ' + this.selectedCountryData.IDN );
            
            var parent = this.$selectedFlag.parent();
            
            if( parent.is(':hidden') )
            {
                parent.css('display', 'table-cell');    
                
                this.$selectedFlag.on('click' + this.ns, function(){
                    that.$countryList.is(':visible') ? that._hideCountryList() : that._showCountryList() ;

		            //very important
		            return false;
                });
                parent.on('keydown' + this.ns, function(e){
                    if( that.$countryList.is(':hidden') && ( e.which == keys.UP || e.which == keys.DOWN || e.which == keys.SPACE || e.which == keys.ENTER ))
                    {                
                        e.preventDefault();
                        e.stopPropagation();
                        that._showCountryList();
                    }  
                    if (e.which == keys.TAB) 
                        that._hideCountryList();
                });
            }    
            this._setPlaceHolder();

        },
        _setPlaceHolder: function()
        {
            if( this.defaultPlaceHolder )
            {                
                if( this.$selectedFlag.is('visible') )
                    var placeholder = this.phoneUtil.getExampleNumber( this.selectedCountryData.IDN, true, this.phoneUtil.numberType.MOBILE );
                else
                    var placeholder = this.defaultPlaceHolder;
                
                this.$multiInput.prop('placeholder', placeholder);
            }
        },
        _showCountryList: function()
        {
            this.$selectedFlag.find('.flag-arrow').addClass('open');
            
            var  $currentItem;
                        
            if( this.selectedCountryData )
            {
                $('li.current', this.$countryList ).removeClass('current highlight');
                
                var index = this.selectedCountryData.index;
                
                $currentItem = $('li:eq('+ this.selectedCountryData.index +')', this.$countryList ).addClass('current highlight');
            }
            this._bindListListeners();
            
            this.$countryList.show();
            
            if( $currentItem )
                this._scrollTo( $currentItem, true );    
        },
        _hideCountryList: function()
        {
            this.$countryList.hide();
            
            this.$selectedFlag.find('.flag-arrow').removeClass('open');
            
            $(document).off( this.ns );
            
            $("html").off( this.ns );
        },
        _scrollTo: function( $item, middle )
        {
            var container = this.$countryList, 
            containerHeight = container.height(), 
            containerTop = container.offset().top, 
            containerBottom = containerTop + containerHeight, 
            
            elementHeight = $item.outerHeight(), 
            elementTop = $item.offset().top, 
            elementBottom = elementTop + elementHeight, 
            
            newScrollTop = elementTop - containerTop + container.scrollTop(), 
            middleOffset = containerHeight / 2 - elementHeight / 2;

            if (elementTop < containerTop) {
                // scroll up
                if (middle) {
                    newScrollTop -= middleOffset;
                }
                container.scrollTop(newScrollTop);
            } else if (elementBottom > containerBottom) {
                // scroll down
                if (middle) {
                    newScrollTop += middleOffset;
                }
                var heightDifference = containerHeight - elementHeight;
                container.scrollTop(newScrollTop - heightDifference);
            }
        },
        _bindListListeners: function()
        {
            var that = this;
            $("html").on('click'+ this.ns, function(e){
                var $target = $(e.target);

                if( $target.hasClass( 'dial-code' ) || $target.hasClass('country-name') || $target.hasClass('flag-item') )
                    that._setSelectedFlag( $target.closest('li') );

                if( that.$countryList.is(':visible') )
                    that._hideCountryList();
            });
            
            var query = "";
            
            this.timer = null;
            
            $(document).on('keydown'+ this.ns, function(e)
            {                
                e.preventDefault();
                if (e.which == keys.UP || e.which == keys.DOWN) {
                    // up and down to navigate
                    that._handleUpDownKey( e.which );
                }
                else if (e.which == keys.ENTER) {
                    // enter to select
                    that._handleEnterKey();
                }
                else if(e.which == keys.ESC)
                {
                    //close list
                    that._hideCountryList();
                }
                else if (e.which >= keys.A && e.which <= keys.Z || e.which == keys.SPACE)
                {
                    if ( that.timer ) {
                        clearTimeout( that.timer );
                    }
                    query += String.fromCharCode(e.which);

                    that._searchForCountry(query);
                    
                    that.timer = setTimeout(function() {
                        query = "";
                    }, 1e3);
                    
                }
            });
        },
        _handleUpDownKey: function( code )
        {
            var $currentItem = this.$countryList.find('li.highlight');
            
            var $target = code == keys.UP ? $currentItem.first().prev() : $currentItem.first().next();

            if( $target.length )
            {       
                $currentItem.removeClass('highlight');
                         
                $target.addClass('highlight');
                
                this._scrollTo( $target );
            }                   
        },
        _handleEnterKey: function()
        {
            var $currentItem = this.$countryList.find('.highlight:first');

            if( $currentItem.length )
            {
                this._setSelectedFlag( $currentItem );

                this._hideCountryList();
            }  
            
        },
        _searchForCountry: function( query )
        {
            for( var i = 0; i < this.$countryList.children().length ; i++ )
            {
                var $item = $('li:eq('+ i +')', this.$countryList);
                
                var name = $item.find('.country-name').text().toUpperCase();
                
                if( name.indexOf( query ) == 0 )
                {
                    this.$countryList.find('.highlight').removeClass('highlight');
                                        
                    $item.addClass('highlight');
                    
                    this._scrollTo( $item , true );
                    
                    break;
                }
            }
        },
        _reset: function()
        {
            this.timer = null;

            $('.flag-item', this.$selectedFlag).removeAttr('class').addClass('flag-item');            
            
            $('li.hightlight', this.$countryList ).removeAttr('class');
            
            this._hideCountryList();
            
            var parent = this.$selectedFlag.parent();
            
            parent.hide();
            
            this.$selectedFlag.off( this.ns );
            
            parent.off( this.ns );
            
            this._setPlaceHolder();
        },
        _getMatchType: function()
        { 
            return this.$selectedFlag.is(':visible') ? 'Mobile' : 'Other';
        },
        _isValid: function()
        {
            if( this.$selectedFlag.is(':visible') && this.selectedCountryData )
                return this.phoneUtil.isValidNumber( this.$multiInput.val(), this.selectedCountryData.IDN );
            return true;
        }
    }
    $.fn[pluginName] = function( options )
    {
        if( options == undefined || typeof options === 'object' )
        {
            this.each(function(){
                //no bind
                if( !$.data(this, "plugin_" + pluginName) )
                {
                    var instance = new Plugin( this, options );
                                        
                    instance._init();                    
                    
                    $.data(this, 'plugin_' + pluginName, instance );
                }                
            });
        }
        else if( typeof options === 'string' )
        {
            var that = $.data( this[0], "plugin_" + pluginName );
            
            return that[ '_' + options ]();
        }
    }
}(jQuery);
