override def renderCreate( createUnspecificProb : (String, String) => Problem,
                             returnFunc : () => Nothing ) : NodeSeq = {



      def create(formValues: String): JsCmd = {
        val formValuesXml = XML.loadString(formValues)
        val regEx = (formValuesXml \ "regexfield").head.text
        val alphabet = (formValuesXml \ "alphabetfield").head.text
        val shortDescription = (formValuesXml \ "shortdescfield").head.text

        //Keep only the chars
        val alphabetList = alphabet.split(" ").filter(_.length() > 0)
        val parsingErrors = GraderConnection.getRegexParsingErrors(regEx, alphabetList)

        if (parsingErrors.isEmpty) {

          val unspecificProblem = createUnspecificProb(shortDescription, "")

          val alphabetToSave = alphabetList.mkString(" ")
          val specificProblem: RegExToNFAProblem = RegExToNFAProblem.create
          specificProblem.problemId(unspecificProblem).regEx(regEx).alphabet(alphabetToSave)
          specificProblem.save

          return JsCmds.RedirectTo("/problems/index")

        } else {
          val errors = "<ul>" + parsingErrors.map("<li>" + _ + "</li>").mkString(" ") + "</ul>"
          val errorsXml = XML.loadString(errors)
          return JsCmds.JsShowId("submitbutton") & JsCmds.JsShowId("feedbackdisplay") & JsCmds.SetHtml("parsingerror", errorsXml)
        }
      }

      val alphabetField = SHtml.text("", value => {}, "id" -> "alphabetfield")
      val regExField = SHtml.text("", value => {}, "id" -> "regexfield")
      val shortDescriptionField = SHtml.textarea("", value => {}, "cols" -> "80", "rows" -> "5", "id" -> "shortdescfield")

      val hideSubmitButton: JsCmd = JsHideId("submitbutton")
      val alphabetFieldValXmlJs: String = "<alphabetfield>' + document.getElementById('alphabetfield').value + '</alphabetfield>"
      val regexFieldValXmlJs: String = "<regexfield>' + document.getElementById('regexfield').value + '</regexfield>"
      val shortdescFieldValXmlJs: String = "<shortdescfield>' + document.getElementById('shortdescfield').value + '</shortdescfield>"
      val ajaxCall: JsCmd = SHtml.ajaxCall(JsRaw("'<createattempt>" + alphabetFieldValXmlJs + regexFieldValXmlJs + shortdescFieldValXmlJs + "</createattempt>'"), create(_))

      val checkAlphabetAndSubmit: JsCmd = JsIf(Call("alphabetChecks", Call("parseAlphabetByFieldName", "alphabetfield")), hideSubmitButton & ajaxCall)

      val submitButton: NodeSeq = <button type='button' id='submitbutton' onclick={checkAlphabetAndSubmit}>Submit</button>

      val template: NodeSeq = Templates(List("regex-to-nfa-problem", "create")) openOr Text("Could not find template /regex-to-nfa-problem/create")
      Helpers.bind("createform", template,
        "alphabetfield" -> alphabetField,
        "regexfield" -> regExField,
        "shortdescription" -> shortDescriptionField,
        "submit" -> submitButton)
  }

  override def renderEdit : Box[(Problem, () => Nothing) => NodeSeq] = Full(renderEditFunc)

  private def renderEditFunc(problem : Problem, returnFunc : () => Nothing) : NodeSeq = {

    val regExToNFAProblem = RegExToNFAProblem.findByGeneralProblem(problem)


    var alphabet : String = regExToNFAProblem.getAlphabet
    var shortDescription : String = problem.getShortDescription
    var longDescription : String = problem.getLongDescription
    var regex : String = regExToNFAProblem.getRegex

    def edit(formValues : String) : JsCmd = {
      val formValuesXml = XML.loadString(formValues)
      val regEx = (formValuesXml \ "regexfield").head.text
      val alphabet = (formValuesXml \ "alphabetfield").head.text
      val shortDescription = (formValuesXml \ "shortdescfield").head.text

      //Keep only the chars
      val alphabetList = alphabet.split(" ").filter(_.length()>0);
      val parsingErrors = GraderConnection.getRegexParsingErrors(regEx, alphabetList)

      if(parsingErrors.isEmpty) {
          val alphabetToSave = alphabetList.mkString(" ")
          val specificProblem: RegExToNFAProblem = RegExToNFAProblem.create

          problem.setShortDescription(shortDescription).setLongDescription(longDescription).save()
          specificProblem.setAlphabet(alphabetToSave).setRegex(regEx).save()
          returnFunc()
        }
      else {
        val errors = "<ul>" + parsingErrors.map("<li>" + _ + "</li>").mkString(" ") + "</ul>"
        val errorsXml = XML.loadString(errors)
        return JsCmds.JsShowId("submitbutton") & JsCmds.JsShowId("feedbackdisplay") & JsCmds.SetHtml("parsingerror", errorsXml)
      }
    }

    // Remember to remove all newlines from the generated XML by using filter    
    val alphabetFieldValXmlJs : String = "<alphabetfield>' + document.getElementById('alphabetfield').value + '</alphabetfield>"
    val regexFieldValXmlJs : String = "<regexfield>' + document.getElementById('regexfield').value + '</regexfield>"
    val shortdescFieldValXmlJs : String = "<shortdescfield>' + document.getElementById('shortdescfield').value + '</shortdescfield>"

    val alphabetField = SHtml.text(alphabet, alphabet=_, "id" -> "alphabetfield")
    val regExField = SHtml.text(regex, regex=_, "id" -> "regexfield")
    val shortDescriptionField = SHtml.textarea(shortDescription, shortDescription = _, "cols" -> "80", "rows" -> "5", "id" -> "shortdescfield")

    val ajaxCall : JsCmd = SHtml.ajaxCall(JsRaw("'<createattempt>" + alphabetFieldValXmlJs + regexFieldValXmlJs + shortdescFieldValXmlJs + "</createattempt>'"), edit(_))
    val hideSubmitButton : JsCmd = JsHideId("submitbutton")
    val checkAlphabetAndSubmit : JsCmd = JsIf(Call("alphabetChecks",Call("parseAlphabetByFieldName", "alphabetfield")), hideSubmitButton & ajaxCall)

    val submitButton : NodeSeq = <button type='button' id='submitbutton' onclick={checkAlphabetAndSubmit}>Submit</button>

    val template : NodeSeq = Templates(List("regex-to-nfa-problem", "edit")) openOr Text("Could not find template /regex-to-nfa-problem/edit")
    Helpers.bind("editform", template,
      "alphabetfield" -> alphabetField,
      "regexfield" -> regExField,
      "shortdescription" -> shortDescriptionField,
      "submit" -> submitButton)
  }