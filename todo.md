# TODO
- Add support for RTL text direction/scroll - only visable with VERTICAL scroll.
  - Switch overflow
  - Change threshold calculation?

* If the element's direction is rtl (right-to-left), then scrollLeft is 0 when the scrollbar is
* at its rightmost position (at the start of the scrolled content), and then increasingly
* negative as you scroll towards the end of the content.

- Change resize observer to be dimension agnostic.
- Add support for enabling resizeObserver before `init()` call.
  - Add property to check if component is initialized.


# NOTES

- Use clientHeight/-Width or offsetHeight/-Width?
  - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetWidth