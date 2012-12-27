<?php
namespace lib\models;

/**
 * Arguments envoyes a la commande.
 * @author $imon
 * @version 1.0
 *
 */
class CmdArguments extends \lib\WebosComponent {
	/**
	 * Les arguments bruts.
	 * @var string
	 */
	protected $all;

	/**
	 * Liste des options.
	 * @var array
	 */
	protected $options = array();
	/**
	 * Liste des parametres.
	 * @var array
	 */
	protected $params = array();

	/**
	 * Definir les arguments envoyes.
	 * @param string $args Les arguments.
	 */
	public function setArguments($args) {
		$this->all = $args;

		$array = str_split($args); //On decompose la commande en caracteres
		$cacheBase = array(
			'str_started' => false,
			'str_type' => null,
			'str_index' => null,
			'str_content' => null,
			'previous' => null,
			'str_option_type' => null,
			'str_stage' => 'index'
		); //On initialise le cache
		$cache = $cacheBase;

		foreach ($array as $char) { //Pour chaque caractere $char
			if ($char == '"') { //Delimiteur de chaine
				if ($cache['previous'] == '\\') { //Si on a echappe le delimiteur
					if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
						$cache['str_content'] = substr($cache['str_content'], 0, -1); //On enleve le \
						$cache['str_content'] .= $char; //On ajoute le "
					} else { //Sinon on remplit l'index
						$cache['str_index'] = substr($cache['str_index'], 0, -1); //on enleve le \
						$cache['str_index'] .= $char; //On ajoute le "
					}
				} else {
					if ($cache['str_started'] == false) { //Si c'est le premier
						$cache['str_started'] = true; //On le sauvegarde
					} else { //Sinon, fin de chaine
						$cache['str_started'] = false;
					}
				}
			} elseif ($char == ' ' && $cache['str_started'] != true) { //Si c'est un espace et qu'on n'est pas dans une chaine
				if ($cache['str_type'] == 'options') { //Si c'est une option
					$this->options[$cache['str_index']] = $cache['str_content']; //On sauvegarde
				} else { //Sinon, c'est un argument
					$this->params[] = $cache['str_index']; //On sauvegarde
				}
				$cache = $cacheBase; //On remet le cache a zero
			} elseif ($char == '-') { //Si c'est un tiret
				if ($cache['previous'] == '-') { //Si le caractere precedant etait aussi un tiret, c'est une option type --fruit=abricot
					$cache['str_option_type'] = 'long'; //Type de l'option
				} elseif ($cache['previous'] == ' ' || $cache['previous'] === null) { //Si c'etait un espace blanc, c'est une option type -aBv
					$cache['str_type'] = 'options'; //C'est une option
					$cache['str_option_type'] = 'short'; //Type de l'option
					$cache['str_stage'] = 'index'; //On remplit l'index
				} else { //Sinon, ce n'est pas une option (e.g. fruit-de-mer)
					if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
						$cache['str_content'] .= $char; //On ajoute le -
					} else { //Sinon, on remplit l'index
						$cache['str_index'] .= $char; //On ajoute le -
					}
				}
			} elseif ($char == '=') { //Si c'est un =
				if ($cache['str_type'] == 'options' && $cache['str_option_type'] == 'long') { //Si c'est une option type --fruit=abricot
					$cache['str_stage'] = 'content'; //On remplit maintenant le contenu
				}
			} else { //Autre caractere
				if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
					$cache['str_content'] .= $char; //On ajoute le caractere
				} else { //Sinon on remplit l'index
					if ($cache['str_type'] == 'options') { //Si c'est une option
						if ($cache['str_option_type'] == 'long') { //Si c'est une option type --fruit=abricot
							$cache['str_index'] .= $char; //On remplit l'index
						} else { //Sinon, c'est une option type -aBv
							$this->options[$char] = null; //On ajoute l'option
							//On definit les parametres au cas ou il y a une autre option apres
							$cache = $cacheBase; //On reinitialise le cache
							$cache['str_type'] = 'options'; //C'est une option
							$cache['str_option_type'] = 'short'; //C'est une option type -aBv
							$cache['str_stage'] = 'index'; //On remplit l'index
						}
					} else { //Sinon c'est un argument
						$cache['str_index'] .= $char; //On ajoute le caractere
					}
				}
			}
			$cache['previous'] = $char; //On definit le caractere precedant
		}

		//On vide le cache du dernier caractere
		if ($cache['str_index'] !== null) {
			if ($cache['str_type'] == 'options') {
				$this->options[$cache['str_index']] = $cache['str_content'];
			} else {
				$this->params[] = $cache['str_index'];
			}
		}
	}

	/*
	 * Recuperer ts les arguments.
	 *
	 * @return Tous les arguments.
	 */
	public function getAll() {
		return $this->all;
	}

	/**
	 * Savoir si une option est definie.
	 * @param string $name L'option.
	 * @return bool Vrai si l'option existe.
	 */
	public function isOption($name) {
		return array_key_exists($name, $this->options);
	}

	/**
	 * Recuperer la valeur d'une option.
	 * @param string $name L'option.
	 * @return string La valeur de l'option
	 */
	public function getOption($name) {
		if ($this->isOption($name))
			return $this->options[$name];
		else
			return false;
	}

	/**
	 * Recuperer toutes les options.
	 * @return array Les options.
	 */
	public function getOptions() {
		return $this->options;
	}

	/**
	 * Compter le nombre de parametres.
	 * @return int Le nombre de parametres.
	 */
	public function countNbrParams() {
		return count($this->params);
	}

	/**
	 * Savoir si un parametre existe.
	 * @param int $no Le numero du parametre.
	 * @return bool Vrai si le parametre existe.
	 */
	public function isParam($no) {
		return array_key_exists($no, $this->params);
	}

	/**
	 * Recuperer un parametre.
	 * @param int $no Le numero du parametre.
	 * @return Le parametre.
	 */
	public function getParam($no) {
		if ($this->isParam($no))
			return $this->params[$no];
		else
			return false;
	}

	/**
	 * Retourner tous les parametres.
	 * @return array Tous les parametres.
	 */
	public function getParams() {
		return $this->params;
	}

	/**
	 * Retourner tous les arguments sous forme de chaine de caracteres.
	 * @return Les arguments, sous forme de chaine de caracteres.
	 */
	public function __toString() {
		return $this->all;
	}

	/**
	 * Retourne un script JavaScript representant les arguments.
	 * @return string Le script JavaScript.
	 */
	public function toJavascript() {
		$out = 'new SScriptArguments('.json_encode(array(
			'params' => $this->getParams(),
			'options' => $this->getOptions()
		)).')';
		return $out;
	}
}