/**
 * One place that writes structured data into the page.
 *
 * The `<` escape is not decoration: a car title or a seller's note containing
 * `</script>` would otherwise close the tag early and inject markup. Every
 * JSON-LD block on the site goes through here so that guard can never be
 * forgotten on one page.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
