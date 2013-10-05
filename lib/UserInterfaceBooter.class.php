<?php
namespace lib;

/**
 * An interface booter.
 * @author Simon Ser
 * @since 1.0beta3
 */
class UserInterfaceBooter extends \lib\Application {
	const INCLUDES_CONF = 'etc/boot-includes.json';

	/**
	 * Initialize this interface booter.
	 */
	public function __construct() {
		parent::__construct();

		$this->name = 'userInterfaceBooter';
	}

	protected function _getIncludes() {
		$conf = new JsonConfig(self::INCLUDES_CONF);

		$files = $conf->read();

		foreach ($files as $i => $path) {
			$files[$i] = './' . $path;
		}

		return $files;
	}

	public function run() {
		//TODO: Language detection
		/*$conf = new Config($this);
		if ($this->managers()->get('File')->exists('~/.config/locale.xml')) {
			$conf->load('~/.config/locale.xml');
		}
		if ($conf->exist('language')) {
			$this->managers()->get('Translation')->setLanguage($conf->get('language'));
		} else {
			$lang = $this->managers()->get('Translation')->detectLanguage();
			if ($this->user->isConnected()) {
				$conf->set('language', $lang);
				$conf->save('~/.config/locale.xml');
			}
		}*/

		$jsIncludes = $this->_getIncludes();
		$t = new TranslationDictionary();

		ob_start();

		//Include layout (basic HTML structure)
		require('boot/includes/layout.php');

		$out = ob_get_contents();
		ob_end_clean();

		$resp = new RawResponse();
		$resp->setValue($out);

		$this->httpResponse->setContent($resp);
	}
}