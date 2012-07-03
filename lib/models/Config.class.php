<?php
namespace lib\models;

/**
 * Config represente un fichier de configuration.
 * @author $imon
 * @version 1.0
 *
 */
class Config extends \lib\WebosComponent {
	/**
	 * L'objet DOMDocument qui permet d'acceder a la configuration.
	 * @var DOMDocument
	 */
	protected $domdocument;
	protected $file;
	protected $config = array();

	/**
	 * Initialiser la configuration.
	 */
	public function __construct(\lib\Webos $webos) {
		parent::__construct($webos);
		$this->domdocument = new \DOMDocument;
	}

	/**
	 * Charger une configuration.
	 * @param string $file Le fichier de configuration.
	 */
	public function load($file) {
		if (!$this->webos->managers()->get('File')->exists($file)) {
			return false;
		}

		$this->file = $this->webos->managers()->get('File')->get($file);

		$this->domdocument->loadXML($this->file->contents());

		$this->config = array();
		$attributes = $this->domdocument->getElementsByTagName('attribute');
		foreach ($attributes as $attribute) {
			$this->config[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
		}
	}

	/**
	 * Retourne le fichier courant.
	 * @return File
	 */
	public function getFile() {
		return $this->file;
	}
	
	/**
	 * Recuperer la configuration au format XML.
	 */
	public function saveXML() {
		$existing = array();
		$attributes = $this->domdocument->getElementsByTagName('attribute');
		foreach ($attributes as $attribute) {
			$existing[$attribute->getAttribute('name')] = $attribute;
		}

		if ($this->domdocument->getElementsByTagName('config')->item(0) == null) {
			$root = $this->domdocument->createElement('config');
			$this->domdocument->appendChild($root);
		} else {
			$root = $this->domdocument->getElementsByTagName('config')->item(0);
		}

		foreach ($this->config as $attribute => $value) {
			if (array_key_exists($attribute, $existing)) {
				$node = $existing[$attribute];
			} else {
				$node = $this->domdocument->createElement('attribute');
				$root->appendChild($node);
				$node->setAttribute('name', $attribute);
			}
			$node->setAttribute('value', $value);
		}

		$configNodes = $root->getElementsByTagName('attribute');
		foreach ($configNodes as $node) {
			if (!array_key_exists($node->getAttribute('name'), $this->config)) {
				$root->removeChild($node);
			}
		}

		$out = $this->domdocument->saveXML();
		return $out;
	}

	/**
	 * Sauvegarder une configuration.
	 * @param string $file Le fichier de configuration.
	 */
	public function save($file = null) {
		if (empty($file)) {
			$file = $this->file;
		} else {
			if (!$this->webos->managers()->get('File')->exists($file)) {
				$file = $this->webos->managers()->get('File')->createFile($file);
			} else {
				$file = $this->webos->managers()->get('File')->get($file);
			}
		}
		
		$out = $this->saveXML();
		
		$file->setContents($out);
	}

	/**
	 * Assigner une valeur a un attribut.
	 * @param string $attribute L'attribut.
	 * @param string $value La valeur de l'attribut.
	 */
	public function set($attribute, $value) {
		$this->config[$attribute] = $value;
	}

	/**
	 * Supprime un attribut.
	 * @param string $attribute L'attribut.
	 */
	public function remove($attribute) {
		unset($this->config[$attribute]);
	}

	/**
	 * Determiner si un attribut existe.
	 * @param string $attribute Le nom de l'attribut.
	 * @return bool Vrai s'il existe.
	 */
	public function exist($attribute) {
		return array_key_exists($attribute, $this->config);
	}

	/**
	 * Recuperer un attribut de la configuration.
	 * @param string $attribute L'attribut a recuperer.
	 * @return bool|string La valeur de l'attribut s'il existe, false sinon.
	 */
	public function get($attribute) {
		return ($this->exist($attribute)) ? $this->config[$attribute] : false;
	}

	public function getConfig() {
		return $this->config;
	}
}