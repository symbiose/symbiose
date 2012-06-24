<?php
namespace lib\models;

/**
 * UserInterface represente une interface utilisateur.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 3 mars 2012
 */
class UserInterface extends \lib\WebosComponent {
	/**
	 * @var string Le nom de l'interface.
	 */
	protected $name;
	/**
	 * @var array Les attributs de l'interface.
	 */
	protected $attributes;
	/**
	 * @var string Le contenu HTML de l'interface.
	 */
	protected $html;
	/**
	 * @var array Les codes Javascript a executer.
	 */
	protected $js = array();
	/**
	 * @var array Les feuilles de style CSS a inclure.
	 */
	protected $css = array();

	/**
	 * Initialise l'interface utilisateur.
	 * @param Webos $webos Le webos.
	 * @param string $name Le nom de l'interface.
	 */
	public function __construct(\lib\Webos $webos, $name = false) {
		//On appelle le constructeur parent
		parent::__construct($webos);

		//Si le nom de l'interface n'est pas specifie
		if ($name === false)
			$name = $this->webos->managers()->get('UserInterface')->getDefault(); //On charge l'interface par defaut

		$this->name = $name;

		//Quelques tests pour verifier que l'interface est complete...
		if (!$this->webos->managers()->get('File')->exists($this->_getInterfaceRoot())) //Dossier d'index
			throw new InvalidArgumentException('Interface graphique "'.$name.'" introuvable : dossier "'.$this->_getInterfaceRoot().'" inexistant');
		$root = $this->webos->managers()->get('File')->get($this->_getInterfaceRoot());
		if (!$root->isDir())
			throw new InvalidArgumentException('Interface graphique "'.$name.'" introuvable : "'.$this->_getInterfaceRoot().'" n\'est pas un dossier');

		if (!$this->webos->managers()->get('File')->exists($this->_getInterfaceRoot().'/config.xml')) //Fichier de configuration
			throw new InvalidArgumentException('Erreur de lors du chargement de l\'interface graphique "'.$name.'" : fichier de configuration ("config.xml") introuvable');

		if (!$this->webos->managers()->get('File')->exists($this->_getInterfaceRoot().'/index.html')) //Contenu (code HTML)
			throw new InvalidArgumentException('Erreur de lors du chargement de l\'interface graphique "'.$name.'" : fichier du contenu ("index.html") introuvable');

		//Configuration de l'interface.
		$xml = new \DOMDocument;
		$xml->loadXML($this->webos->managers()->get('File')->get($this->_getInterfaceRoot().'/config.xml')->contents());

		$attributes = $xml->getElementsByTagName('attribute');
		foreach ($attributes as $attr) {
			$this->attributes[$attr->getAttribute('name')] = $attr->getAttribute('value');
		}

		$includes = $xml->getElementsByTagName('includes')->item(0)->getElementsByTagName('file');
		foreach ($includes as $include) { //Fichiers a inclure
			$file = $this->webos->managers()->get('File')->get($include->getAttribute('path'));
			switch($file->extension()) {
				case 'js':
					$this->js[$file->path()] = $file->contents(); //On ajoute le code JS
					break;
				case 'css':
					$this->css[] = $file->contents(); //On ajoute le fichier CSS a la liste
					break;
			}
		}

		//Contenu de l'interface (code HTML)
		$htmlFile = $this->webos->managers()->get('File')->get($this->_getInterfaceRoot().'/index.html');
		$this->html = $htmlFile->contents();

		//Code Javascript
		if ($this->webos->managers()->get('File')->exists($this->_getInterfaceRoot().'/index.js')) {
			$jsFile = $this->webos->managers()->get('File')->get($this->_getInterfaceRoot().'/index.js');
			$this->js[$jsFile->path()] = $jsFile->contents();
		}
	}

	/**
	 * Recuperer le dossier racine de l'interface.
	 * @return string Le dossier racine.
	 */
	protected function _getInterfaceRoot() {
		return '/boot/uis/'.$this->name;
	}

	/**
	 * Recuperer le code HTML de l'interface.
	 * @return string Le code HTML.
	 */
	public function getHtml() {
		return $this->html;
	}

	/**
	 * Recuperer les codes JavaScript de l'interface.
	 * @return array Les scripts JS.
	 */
	public function getJavascript() {
		return $this->js;
	}

	/**
	 * Recuperer les feuilles de style CSS a inclure.
	 * @return array Les feuilles de style CSS a inclure.
	 */
	public function getCss() {
		return $this->css;
	}

	/**
	 * Recuperer le nom de l'interface.
	 * @return string Le nom de l'interface.
	 */
	public function getName() {
		return $this->name;
	}

	/**
	 * Recuperer les attributs de l'interface.
	 * @return array Les attributs de l'interface.
	 */
	public function getAttributes() {
		return $this->attributes;
	}

	/**
	 * Recuperer un attribut de l'interface.
	 * @return string L'attribut de l'interface.
	 */
	public function getAttribute($name) {
		if (!array_key_exists($name, $this->attributes))
			return null;

		return $this->attributes[$name];
	}
}