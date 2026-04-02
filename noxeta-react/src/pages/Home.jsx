export default function Home() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #000, #111)",
      color: "#fff",
      textAlign: "center",
      padding: "20px"
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        marginBottom: "20px",
        color: "#ff4d4f"
      }}>
        🚧 Site Locked 🚧
      </h1>

      <p style={{
        fontSize: "1.2rem",
        maxWidth: "600px",
        opacity: 0.8
      }}>
        This website will go live only after payment of the developers.
      </p>
    </div>
  );
}
