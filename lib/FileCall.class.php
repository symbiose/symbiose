<?php
namespace lib;

/**
 * FileCall est la classe representant une requete d'un fichier.
 * @author $imon
 * @version 1.0
 */
class FileCall extends Webos {
	/**
	 * Le fichier a renvoyer.
	 * @var string
	 */
	protected $filename;

	/**
	 * Initialiser la requete.
	 */
	public function __construct() {
		parent::__construct(); //On appelle le constructeur parent

		//On initialise la requete et la reponse HTTP
		$this->httpRequest = new HTTPRequest();
		$this->httpResponse = new HTTPResponse();

		$requestType = ($this->httpRequest->getExists('type')) ? $this->httpRequest->getData('type') : 'file';
		$key = $this->httpRequest->getData('file');

		if (empty($key)) {
			$this->getHTTPResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \InvalidArgumentException('Aucun fichier sp&eacute;cifi&eacute;');
		}

		switch ($requestType) {
			case 'file':
				$filename = $key;
				break;
			case 'icon':
				$data = explode('/', $key, 4);
				$type = $data[0];
				$iconsPath = '/usr/share/icons/'.$type;

				if (count($data) == 4) {
					$theme = $data[1];
					$size = $data[2];
					$iconName = $data[3];
					$dir = $theme.'/'.$size;

					$testState = 0;

					while(!$this->managers()->get('File')->exists($iconsPath.'/'.$dir.'/'.$iconName.'.png')) {
						switch($testState) {
							case 0: //On cherche d'autres tailles
								if (!$this->managers()->get('File')->exists($iconsPath.'/'.$theme)) {
									break;
								}
								$sizesDirs = $this->managers()->get('File')->get($iconsPath.'/'.$theme)->contents();
								$availableSizes = array();
								foreach ($sizesDirs as $file) {
									if (!$file->isDir()) {
										continue;
									}
									if ((int) $file->basename() != 0 && $this->managers()->get('File')->exists($file->path().'/'.$iconName.'.png')) {
										$availableSizes[] = (int) $file->basename();
									}
								}

								if (count($availableSizes) == 0) {
									break;
								}

								$selectedSize = 0;
								arsort($availableSizes);
								foreach($availableSizes as $availableSize) {
									if ($selectedSize == 0 || ($availableSize >= $size && $availableSize < $selectedSize)) {
										$selectedSize = $availableSize;
									}
								}
								$size = $selectedSize;
								break;
							case 1: //On cherche d'autres themes
								$themesDirs = $this->managers()->get('File')->get($iconsPath)->contents();
								$availableThemes = array();
								foreach ($themesDirs as $themeFile) {
									if (!$themeFile->isDir()) {
										continue;
									}
									$sizesDirs = $this->managers()->get('File')->get($themeFile->path())->contents();
									foreach ($sizesDirs as $file) {
										if (!$file->isDir()) {
											continue;
										}
										if ((int) $file->basename() != 0 && $this->managers()->get('File')->exists($file->path().'/'.$iconName.'.png')) {
											if (!array_key_exists($themeFile->basename(), $availableThemes)) {
												$availableThemes[$themeFile->basename()] = array();
											}
											$availableThemes[$themeFile->basename()][] = (int) $file->basename();
										}
									}
								}

								if (count($availableThemes) == 0) {
									break;
								}

								$selectedSize = 0;
								$selectedTheme = null;

								foreach($availableThemes as $name => $availableSizes) {
									arsort($availableSizes);
									foreach($availableSizes as $availableSize) {
										if ($selectedSize == 0 || ($availableSize >= $size && $availableSize < $selectedSize)) {
											$selectedTheme = $name;
											$selectedSize = $availableSize;
										}
									}
								}

								$size = $selectedSize;
								$theme = $selectedTheme;
								break;
							case 2:
								break 2;
						}
						$dir = $theme.'/'.$size;
						$testState++;
					}
				} else {
					$size = $data[1];
					$iconName = $data[2];
					$dir = $size;

					$sizesDirs = $this->managers()->get('File')->get($iconsPath)->contents();
					$availableSizes = array();
					foreach ($sizesDirs as $file) {
						if (!$file->isDir()) {
							continue;
						}
						if ((int) $file->basename() != 0 && $this->managers()->get('File')->exists($file->path().'/'.$iconName.'.png')) {
							$availableSizes[] = (int) $file->basename();
						}
					}

					if (count($availableSizes) != 0) {
						$selectedSize = 0;
						arsort($availableSizes);
						foreach($availableSizes as $availableSize) {
							if ($selectedSize == 0 || ($availableSize >= $size && $availableSize < $selectedSize)) {
								$selectedSize = $availableSize;
							}
						}
						$size = $selectedSize;
					}

					$dir = $size;
				}

				$filename = $iconsPath.'/'.$dir.'/'.$iconName.'.png';

				break;
			default:
				$this->getHTTPResponse()->addHeader('HTTP/1.0 403 Forbidden');
				throw new \InvalidArgumentException('Type de requ&ecirc;te de fichier "'.$requestType.'" inconnu');
		}

		$this->filename = $filename;

		try {
			$file = $this->managers()->get('File')->get($filename);
		} catch (\Exception $e) {
			$this->getHTTPResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw $e;
		}

		if ($file->isDir()) {
			$this->getHTTPResponse()->addHeader('HTTP/1.0 403 Forbidden');
			throw new \InvalidArgumentException('Ce fichier est un dossier');
		}

		$authorizations = new Authorization($this, $this->user);
		$requiredAuthorization = $authorizations->getArgumentAuthorizations($file->path(), 'file', 'read');
		try {
			$authorizations->control($requiredAuthorization);
		} catch (\Exception $e) {
			$this->getHTTPResponse()->addHeader('HTTP/1.0 403 Forbidden');
			throw $e;
		}
	}

	/**
	 * Executer la requete.
	 */
	public function run() {
		$file = $this->managers()->get('File')->get($this->filename);

		$cacheOffset = 7 * 24 * 3600;
		$this->getHTTPResponse()->addHeader('Content-Type: '.$file->mime());
		$this->getHTTPResponse()->addHeader('Content-Transfer-Encoding: binary');
		$this->getHTTPResponse()->addHeader('Content-Length: ' . $file->size());
		$this->getHTTPResponse()->addHeader('Cache-Control: max-age=' . $cacheOffset . ', must-revalidate');
		$this->getHTTPResponse()->addHeader('Expires: ' . gmdate('D, d M Y H:i:s', time() + $cacheOffset) . ' GMT');
		$this->getHTTPResponse()->removeHeader('Pragma');

		//Desactivation de la compression des reponses
		if (false && preg_match('#^(image|audio|video)/#', $file->mime())) {
			ob_start('ob_gzhandler');
		}

		readfile($file->realpath());

		if (false) {
			ob_end_flush();
		}

		//On envoie la reponse HTTP
		$this->getHTTPResponse()->send();
	}
}
