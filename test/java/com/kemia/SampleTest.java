package com.kemia;

import com.thoughtworks.selenium.*;
import java.util.regex.Pattern;

public class SampleTest extends SeleneseTestCase {
    public void setUp() throws Exception {
//        setUp("http://www.google.com/", "*firefox");
//        setUp("http://www.google.com/", "*chrome");
        setUp("http://www.google.com/", "*safari");
    }
      public void testNew() throws Exception {
          selenium.open("/");
          selenium.type("q", "selenium rc");
          selenium.click("btnG");
          selenium.waitForPageToLoad("30000");
          assertTrue(selenium.isTextPresent("Selenium Remote-Control"));
    }
}