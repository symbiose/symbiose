<?php
namespace lib\models;

/**
 * FileProcess represente un processus correspondant a un programme dans un fichier.
 * @author $imon
 * @version 1.0
 * @since 1.0
 */
class FileProcess extends Process {
	/**
	 * Le chemin vers le programme.
	 * @var string
	 */
	protected $path;

	/**
	 * Initialise le processus.
	 * @param Webos $webos Le webos.
	 * @param Authorization $auth Les authorisations du processus.
	 * @param string $path Le chemin vers le programme.
	 */
	public function __construct(\lib\Webos $webos, \lib\Authorization $auth, $path) {
		//On appelle le constructeur du parent.
		parent::__construct($webos, $auth);

		$this->path = $path;
	}

	/**
	 * Recuperer le chemin vers le programme.
	 * @return string
	 */
	public function getPath() {
		return $this->path;
	}

	/**
	 * Lance le processus.
	 */
	public function run() {
		$file = $this->webos->managers()->get('File')->get($this->path);

		if ($file->isDir() || ($file->extension() != 'php' && $file->extension() != 'js')) {
			throw new \InvalidArgumentException('"'.$file->path().'" : aucun programme de ce type');
		}

		switch ($file->extension()) {
			case 'php':
				require($file->realpath());
				$this->stop();
				break;
			case 'js':
				$js = $file->contents();
				$this->webos->getHTTPResponse()->setData(array(
					'pid' => $this->webos->getProcess()->getId(),
					'key' => $this->webos->getProcess()->getKey(),
					'authorizations' => $this->webos->getProcess()->getAuthorization()->get(),
					'path' => $this->getPath()
				));
				$this->webos->getHTTPResponse()->setJavascript($js);
				break;
		}
	}
}